import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

/** Normalize a Postgres DATE value (Date object or ISO string) to 'YYYY-MM-DD' */
function toDateStr(v: unknown): string {
  return v instanceof Date ? v.toISOString().split('T')[0] : String(v).split('T')[0];
}

const VALID_MONTHS = [1, 2, 3, 4];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const attendanceType = params.get('attendance_type') || 'sunday_service';
  if (!['sunday_service', 'house_church'].includes(attendanceType)) {
    return NextResponse.json({ error: 'Invalid attendance_type' }, { status: 400 });
  }

  const monthsRaw = parseInt(params.get('months') || '2', 10);
  const months = VALID_MONTHS.includes(monthsRaw) ? monthsRaw : 2;

  const houseChurchId = params.get('house_church_id') || null;

  // Start of the window: today minus N months
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  const startDate = start.toISOString().split('T')[0];

  try {
    const sessionRows = await sql(
      `SELECT date FROM attendance_sessions
       WHERE attendance_type = $1
         AND date >= $2
         AND ($3::uuid IS NULL OR house_church_id = $3::uuid)
       ORDER BY date`,
      [attendanceType, startDate, houseChurchId]
    );

    const recordRows = await sql(
      `SELECT member_id::text, date FROM attendance
       WHERE attendance_type = $1
         AND date >= $2
         AND ($3::uuid IS NULL OR house_church_id = $3::uuid)
         AND present = true`,
      [attendanceType, startDate, houseChurchId]
    );

    let meetingDay: string | null = null;
    if (houseChurchId) {
      const hcRows = await sql(
        'SELECT meeting_day FROM house_churches WHERE id = $1',
        [houseChurchId]
      );
      meetingDay = hcRows[0]?.meeting_day || null;
    }

    // House churches the caller pastors, so the client can default the
    // house church selector to their own rather than the first in the list.
    const myHcRows = await sql(
      `SELECT hc.id FROM house_churches hc
       JOIN members m ON hc.pastor_id = m.id
       WHERE m.user_id = $1`,
      [session.user.id]
    );

    return NextResponse.json({
      sessions: sessionRows.map((r) => toDateStr(r.date)),
      meeting_day: meetingDay,
      records: recordRows.map((r) => ({
        member_id: r.member_id,
        date: toDateStr(r.date),
      })),
      my_house_church_ids: myHcRows.map((r) => r.id as string),
    });
  } catch (error) {
    console.error('Attendance history error:', error);
    return NextResponse.json({ error: 'Failed to load attendance history' }, { status: 500 });
  }
}
