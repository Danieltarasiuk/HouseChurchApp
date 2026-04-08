import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const date = req.nextUrl.searchParams.get('date');
  const attendanceType = req.nextUrl.searchParams.get('attendance_type');

  if (!date || !attendanceType) {
    return NextResponse.json({ error: 'date and attendance_type required' }, { status: 400 });
  }

  const houseChurchId = req.nextUrl.searchParams.get('house_church_id') || null;

  try {
    const rows = await sql(
      `SELECT member_id::text FROM attendance
       WHERE date = $1
         AND attendance_type = $2
         AND ($3::uuid IS NULL OR house_church_id = $3::uuid)
         AND present = true`,
      [date, attendanceType, houseChurchId]
    );

    const presentMemberIds = rows.map((r: Record<string, string>) => r.member_id);
    return NextResponse.json({ present_member_ids: presentMemberIds });
  } catch (error) {
    console.error('Attendance existing error:', error);
    return NextResponse.json({ error: 'Failed to load existing attendance' }, { status: 500 });
  }
}
