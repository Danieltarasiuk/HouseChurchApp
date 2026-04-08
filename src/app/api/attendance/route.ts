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

    // Delete existing records for this date + type + hc (idempotent upsert)
    if (house_church_id) {
      await sql(
        `DELETE FROM attendance WHERE date = $1 AND attendance_type = $2 AND house_church_id = $3`,
        [date, attendance_type, house_church_id]
      );
    } else {
      await sql(
        `DELETE FROM attendance WHERE date = $1 AND attendance_type = $2 AND house_church_id IS NULL`,
        [date, attendance_type]
      );
    }

    // Bulk insert all records (both present and absent)
    let count = 0;
    for (const record of records) {
      await sql(
        `INSERT INTO attendance (house_church_id, member_id, date, attendance_type, present)
         VALUES ($1, $2, $3, $4, $5)`,
        [house_church_id || null, record.member_id, date, attendance_type, record.present]
      );
      count++;
    }

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
    const result: Record<string, { dates: string[]; present: string[] }> = {};

    for (const type of ['sunday_service', 'house_church'] as const) {
      // Get last N distinct dates where attendance was taken for anyone
      const dateRows = await sql(
        `SELECT DISTINCT date FROM attendance
         WHERE attendance_type = $1
         ORDER BY date DESC
         LIMIT $2`,
        [type, limit]
      );

      const dates = dateRows.map((r) => {
        const d = r.date;
        return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
      });

      if (dates.length === 0) {
        result[type] = { dates: [], present: [] };
        continue;
      }

      // Check which of those dates this member was present
      const placeholders = dates.map((_, i) => `$${i + 3}`).join(',');
      const presentRows = await sql(
        `SELECT date FROM attendance
         WHERE member_id = $1 AND attendance_type = $2 AND present = true
           AND date IN (${placeholders})`,
        [memberId, type, ...dates]
      );

      const presentDates = presentRows.map((r) => {
        const d = r.date;
        return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
      });

      result[type] = { dates, present: presentDates };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Attendance fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
