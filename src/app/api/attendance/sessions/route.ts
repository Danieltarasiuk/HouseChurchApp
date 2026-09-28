import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

/** Normalize a Postgres DATE value (Date object or ISO string) to 'YYYY-MM-DD' */
function toDateStr(v: unknown): string {
  return v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];
}

const VALID_MONTHS = [1, 2, 3, 4];
const VALID_TYPES = ['sunday_service', 'house_church'];

async function authorize() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== 'admin' && role !== 'house_church_pastor') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { userId: session.user.id, role };
}

/** Recorded attendance sessions in the window, newest first. */
export async function GET(req: NextRequest) {
  const authz = await authorize();
  if (authz.error) return authz.error;

  const params = req.nextUrl.searchParams;
  const attendanceType = params.get('attendance_type') || 'sunday_service';
  if (!VALID_TYPES.includes(attendanceType)) {
    return NextResponse.json({ error: 'Invalid attendance_type' }, { status: 400 });
  }

  const monthsRaw = parseInt(params.get('months') || '2', 10);
  const months = VALID_MONTHS.includes(monthsRaw) ? monthsRaw : 2;

  const houseChurchId = params.get('house_church_id') || null;

  const start = new Date();
  start.setMonth(start.getMonth() - months);
  const startDate = start.toISOString().split('T')[0];

  try {
    const rows = await sql(
      `SELECT s.date, s.attendance_type, s.house_church_id,
              hc.name AS house_church_name,
              u.name AS recorded_by_name,
              (SELECT COUNT(*)::int FROM attendance a
               WHERE a.date = s.date
                 AND a.attendance_type = s.attendance_type
                 AND a.house_church_id IS NOT DISTINCT FROM s.house_church_id
                 AND a.present = true) AS present_count
       FROM attendance_sessions s
       LEFT JOIN house_churches hc ON s.house_church_id = hc.id
       LEFT JOIN users u ON s.recorded_by = u.id
       WHERE s.attendance_type = $1
         AND s.date >= $2
         AND ($3::uuid IS NULL OR s.house_church_id = $3::uuid)
       ORDER BY s.date DESC`,
      [attendanceType, startDate, houseChurchId]
    );

    return NextResponse.json({
      sessions: rows.map((r) => ({
        date: toDateStr(r.date),
        attendance_type: r.attendance_type,
        house_church_id: r.house_church_id,
        house_church_name: r.house_church_name,
        recorded_by_name: r.recorded_by_name,
        present_count: r.present_count,
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
 * otherwise deleting a null-HC session would also wipe house church rows
 * that share the date.
 */
export async function DELETE(req: NextRequest) {
  const authz = await authorize();
  if (authz.error) return authz.error;

  let body: { date?: unknown; attendance_type?: unknown; house_church_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { date, attendance_type } = body;
  const houseChurchId = typeof body.house_church_id === 'string' && body.house_church_id
    ? body.house_church_id
    : null;

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  if (typeof attendance_type !== 'string' || !VALID_TYPES.includes(attendance_type)) {
    return NextResponse.json({ error: 'Invalid attendance_type' }, { status: 400 });
  }

  try {
    // HC pastors may only delete house church sessions of house churches they pastor.
    if (authz.role !== 'admin') {
      if (attendance_type !== 'house_church' || !houseChurchId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const myHcRows = await sql(
        `SELECT hc.id FROM house_churches hc
         JOIN members m ON hc.pastor_id = m.id
         WHERE m.user_id = $1`,
        [authz.userId]
      );
      if (!myHcRows.some((r) => r.id === houseChurchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const deleted = await sql(
      `DELETE FROM attendance
       WHERE date = $1
         AND attendance_type = $2
         AND house_church_id IS NOT DISTINCT FROM $3::uuid
       RETURNING id`,
      [date, attendance_type, houseChurchId]
    );

    await sql(
      `DELETE FROM attendance_sessions
       WHERE date = $1
         AND attendance_type = $2
         AND house_church_id IS NOT DISTINCT FROM $3::uuid`,
      [date, attendance_type, houseChurchId]
    );

    return NextResponse.json({ success: true, deleted_records: deleted.length });
  } catch (error) {
    console.error('Attendance session delete error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
