import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { monthsAgoInChurchTz } from '@/lib/churchTime';
import { requireViewer, forbidden, leadsGroup, leaderGroupScope, LEADER_ROLES } from '@/lib/authz';

/** Normalize a Postgres DATE value (Date object or ISO string) to 'YYYY-MM-DD' */
function toDateStr(v: unknown): string {
  return v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];
}

const VALID_MONTHS = [1, 2, 3, 4];

export async function GET(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;
  // null = all groups (admin); a pastor gets exactly their own.
  const scope = leaderGroupScope(viewer);

  const params = req.nextUrl.searchParams;
  const attendanceType = params.get('attendance_type') || 'sunday_service';
  if (!['sunday_service', 'group'].includes(attendanceType)) {
    return NextResponse.json({ error: 'Invalid attendance_type' }, { status: 400 });
  }

  const monthsRaw = parseInt(params.get('months') || '2', 10);
  const months = VALID_MONTHS.includes(monthsRaw) ? monthsRaw : 2;

  const groupId = params.get('group_id') || null;
  if (scope && groupId && !leadsGroup(viewer, groupId)) return forbidden();

  // Start of the window: N months before today in the church's calendar
  // (the UTC date is already tomorrow on Sunday evenings in Miami).
  const startDate = monthsAgoInChurchTz(months);

  try {
    const sessionRows = await sql(
      `SELECT date FROM attendance_sessions
       WHERE attendance_type = $1
         AND date >= $2
         AND ($3::uuid IS NULL OR group_id = $3::uuid)
         AND ($1 <> 'group' OR $4::text[] IS NULL OR group_id::text = ANY($4::text[]))
       ORDER BY date`,
      [attendanceType, startDate, groupId, scope]
    );

    const recordRows = await sql(
      `SELECT member_id::text, date FROM attendance
       WHERE attendance_type = $1
         AND date >= $2
         AND ($3::uuid IS NULL OR group_id = $3::uuid)
         AND present = true
         AND ($4::text[] IS NULL OR member_id IN (SELECT id FROM members WHERE group_id::text = ANY($4::text[])))`,
      [attendanceType, startDate, groupId, scope]
    );

    let meetingDay: string | null = null;
    if (groupId) {
      const groupRows = await sql(
        'SELECT meeting_day FROM groups WHERE id = $1',
        [groupId]
      );
      meetingDay = groupRows[0]?.meeting_day || null;
    }


    return NextResponse.json({
      sessions: sessionRows.map((r) => toDateStr(r.date)),
      meeting_day: meetingDay,
      records: recordRows.map((r) => ({
        member_id: r.member_id,
        date: toDateStr(r.date),
      })),
      // So the client can default its group selector to the caller's own.
      my_group_ids: viewer.ledGroupIds,
    });
  } catch (error) {
    console.error('Attendance history error:', error);
    return NextResponse.json({ error: 'Failed to load attendance history' }, { status: 500 });
  }
}
