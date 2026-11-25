import { NextRequest, NextResponse } from 'next/server';
import { sql, currentChurch } from '@/lib/db';
import { monthsAgoInChurchTz } from '@/lib/churchTime';
import { requireViewer, forbidden, leadsGroup, leaderGroupScope, LEADER_ROLES } from '@/lib/authz';
import { inChurch } from '@/lib/churchRoute';

/** Normalize a Postgres DATE value (Date object or ISO string) to 'YYYY-MM-DD' */
function toDateStr(v: unknown): string {
  return v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];
}

const VALID_MONTHS = [1, 2, 3, 4];
const VALID_TYPES = ['sunday_service', 'group'];

/** Recorded attendance sessions in the window, newest first. */
async function handleGET(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;
  // null = all groups (admin); a pastor gets exactly their own.
  const scope = leaderGroupScope(viewer);

  const params = req.nextUrl.searchParams;
  const attendanceType = params.get('attendance_type') || 'sunday_service';
  if (!VALID_TYPES.includes(attendanceType)) {
    return NextResponse.json({ error: 'Invalid attendance_type' }, { status: 400 });
  }

  const monthsRaw = parseInt(params.get('months') || '2', 10);
  const months = VALID_MONTHS.includes(monthsRaw) ? monthsRaw : 2;

  const groupId = params.get('group_id') || null;
  if (scope && groupId && !leadsGroup(viewer, groupId)) return forbidden();

  // Start of the window: N months before today in the church's calendar
  // (the UTC date is already tomorrow on Sunday evenings in Miami).
  const startDate = monthsAgoInChurchTz(months, currentChurch().timezone);

  try {
    const rows = await sql(
      `SELECT s.date, s.attendance_type, s.group_id,
              hc.name AS group_name,
              u.name AS recorded_by_name,
              (SELECT COUNT(*)::int FROM attendance a
               WHERE a.date = s.date
                 AND a.attendance_type = s.attendance_type
                 AND a.group_id IS NOT DISTINCT FROM s.group_id
                 AND a.present = true
                 AND ($4::text[] IS NULL OR a.member_id IN (SELECT id FROM members WHERE group_id::text = ANY($4::text[])))) AS present_count,
              (SELECT COUNT(*)::int FROM attendance a
               JOIN members m ON m.id = a.member_id
               WHERE a.date = s.date
                 AND a.attendance_type = s.attendance_type
                 AND a.group_id IS NOT DISTINCT FROM s.group_id
                 AND a.present = true
                 AND m.date_of_birth IS NOT NULL
                 AND m.date_of_birth > s.date - INTERVAL '18 years'
                 AND ($4::text[] IS NULL OR m.group_id::text = ANY($4::text[]))) AS kid_count
       FROM attendance_sessions s
       LEFT JOIN groups hc ON s.group_id = hc.id
       LEFT JOIN users u ON s.recorded_by = u.id
       WHERE s.attendance_type = $1
         AND s.date >= $2
         AND ($3::uuid IS NULL OR s.group_id = $3::uuid)
         AND ($1 <> 'group' OR $4::text[] IS NULL OR s.group_id::text = ANY($4::text[]))
       ORDER BY s.date DESC`,
      [attendanceType, startDate, groupId, scope]
    );

    return NextResponse.json({
      sessions: rows.map((r) => ({
        date: toDateStr(r.date),
        attendance_type: r.attendance_type,
        group_id: r.group_id,
        group_name: r.group_name,
        recorded_by_name: r.recorded_by_name,
        present_count: r.present_count,
        kid_count: r.kid_count,
        adult_count: r.present_count - r.kid_count,
      })),
    });
  } catch (error) {
    console.error('Attendance sessions error:', error);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

/**
 * Deletes one session and its attendance rows. Scope is matched exactly
 * (IS NOT DISTINCT FROM), unlike the history route's "null = any" filter —
 * otherwise deleting a null-group session would also wipe group rows
 * that share the date.
 */
async function handleDELETE(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;

  let body: { date?: unknown; attendance_type?: unknown; group_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { date, attendance_type } = body;
  const groupId = typeof body.group_id === 'string' && body.group_id
    ? body.group_id
    : null;

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  if (typeof attendance_type !== 'string' || !VALID_TYPES.includes(attendance_type)) {
    return NextResponse.json({ error: 'Invalid attendance_type' }, { status: 400 });
  }

  try {
    // group leaders may only delete group sessions of groups
    // they pastor (a Sunday session holds everyone's attendance).
    if (viewer.role !== 'admin' && (attendance_type !== 'group' || !leadsGroup(viewer, groupId))) {
      return forbidden();
    }

    const deleted = await sql(
      `DELETE FROM attendance
       WHERE date = $1
         AND attendance_type = $2
         AND group_id IS NOT DISTINCT FROM $3::uuid
       RETURNING id`,
      [date, attendance_type, groupId]
    );

    await sql(
      `DELETE FROM attendance_sessions
       WHERE date = $1
         AND attendance_type = $2
         AND group_id IS NOT DISTINCT FROM $3::uuid`,
      [date, attendance_type, groupId]
    );

    return NextResponse.json({ success: true, deleted_records: deleted.length });
  } catch (error) {
    console.error('Attendance session delete error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
export const DELETE = inChurch(handleDELETE);
