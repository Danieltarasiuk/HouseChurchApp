import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { date, attendance_type, house_church_id, records } = body;

    if (!date || !attendance_type || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['sunday_service', 'house_church'].includes(attendance_type)) {
      return NextResponse.json({ error: 'Invalid attendance_type' }, { status: 400 });
    }

    // "Absent" is inferred: if a session exists for this scope (date+type+hc)
    // but no attendance row exists for a member, they were absent.
    const typed = records as { member_id: string; present: boolean }[];
    const presentRecords = typed.filter((r) => r.present);
    const absentIds = typed.filter((r) => !r.present).map((r) => r.member_id);

    // Clear rows for members explicitly unchecked in this submission, so
    // correcting a mistake actually removes the earlier present row.
    if (absentIds.length > 0) {
      await sql(
        `DELETE FROM attendance
         WHERE date = $1
           AND attendance_type = $2
           AND ($3::uuid IS NULL OR house_church_id = $3::uuid)
           AND member_id = ANY($4::uuid[])`,
        [date, attendance_type, house_church_id || null, absentIds]
      );
    }

    let count = 0;
    for (const record of presentRecords) {
      try {
        await sql(
          `INSERT INTO attendance (house_church_id, member_id, date, attendance_type, present)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (member_id, date, attendance_type) DO NOTHING`,
          [house_church_id || null, record.member_id, date, attendance_type]
        );
        count++;
      } catch (insertError) {
        console.error('[Attendance POST] Insert failed for member:', record.member_id, insertError);
      }
    }

    // Record that attendance was taken, even if nobody was marked present —
    // that is what lets the history grid tell "no session" from "all absent".
    // Bare DO NOTHING: the unique index is on an expression, so it cannot be
    // named as a conflict target.
    await sql(
      `INSERT INTO attendance_sessions (date, attendance_type, house_church_id, recorded_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [date, attendance_type, house_church_id || null, session.user.id ?? null]
    );

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Attendance save error:', error);
    return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const memberId = req.nextUrl.searchParams.get('member_id');
  if (!memberId) {
    return NextResponse.json({ error: 'member_id required' }, { status: 400 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10', 10);

  try {
    // Look up member's house_church_id for scoping HC attendance
    const memberRows = await sql(
      'SELECT house_church_id FROM members WHERE id = $1',
      [memberId]
    );
    const memberHcId = memberRows[0]?.house_church_id || null;

    const result: Record<string, { dates: string[]; present: string[] }> = {};

    const formatDate = (r: Record<string, unknown>) => {
      const d = r.date;
      return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
    };

    // --- Sunday Service: any attendance record for this type = church met that day ---
    {
      const dateRows = await sql(
        `SELECT DISTINCT date FROM attendance
         WHERE attendance_type = 'sunday_service'
         ORDER BY date DESC
         LIMIT $1`,
        [limit]
      );
      const dates = dateRows.map(formatDate);

      if (dates.length === 0) {
        result.sunday_service = { dates: [], present: [] };
      } else {
        const ph = dates.map((_, i) => `$${i + 2}`).join(',');
        const presentRows = await sql(
          `SELECT date FROM attendance
           WHERE member_id = $1 AND attendance_type = 'sunday_service'
             AND date IN (${ph})`,
          [memberId, ...dates]
        );
        result.sunday_service = { dates, present: presentRows.map(formatDate) };
      }
    }

    // --- House Church: only dates where THIS member's HC had attendance ---
    {
      if (!memberHcId) {
        result.house_church = { dates: [], present: [] };
      } else {
        const dateRows = await sql(
          `SELECT DISTINCT date FROM attendance
           WHERE attendance_type = 'house_church' AND house_church_id = $1
           ORDER BY date DESC
           LIMIT $2`,
          [memberHcId, limit]
        );
        const dates = dateRows.map(formatDate);

        if (dates.length === 0) {
          result.house_church = { dates: [], present: [] };
        } else {
          const ph = dates.map((_, i) => `$${i + 2}`).join(',');
          const presentRows = await sql(
            `SELECT date FROM attendance
             WHERE member_id = $1 AND attendance_type = 'house_church'
               AND date IN (${ph})`,
            [memberId, ...dates]
          );
          result.house_church = { dates, present: presentRows.map(formatDate) };
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Attendance fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
