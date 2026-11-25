import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer, forbidden, pastorsHc, leaderHcScope, LEADER_ROLES } from '@/lib/authz';

export async function GET(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;
  // null = all house churches (admin); a pastor gets exactly their own.
  const scope = leaderHcScope(viewer);

  const date = req.nextUrl.searchParams.get('date');
  const attendanceType = req.nextUrl.searchParams.get('attendance_type');

  if (!date || !attendanceType) {
    return NextResponse.json({ error: 'date and attendance_type required' }, { status: 400 });
  }

  const houseChurchId = req.nextUrl.searchParams.get('house_church_id') || null;
  if (scope && attendanceType === 'house_church' && !pastorsHc(viewer, houseChurchId)) return forbidden();

  try {
    const rows = await sql(
      `SELECT member_id::text FROM attendance
       WHERE date = $1
         AND attendance_type = $2
         AND ($3::uuid IS NULL OR house_church_id = $3::uuid)
         AND present = true
         AND ($4::text[] IS NULL OR member_id IN (SELECT id FROM members WHERE house_church_id::text = ANY($4::text[])))`,
      [date, attendanceType, houseChurchId, scope]
    );

    const presentMemberIds = rows.map((r: Record<string, string>) => r.member_id);
    return NextResponse.json({ present_member_ids: presentMemberIds });
  } catch (error) {
    console.error('Attendance existing error:', error);
    return NextResponse.json({ error: 'Failed to load existing attendance' }, { status: 500 });
  }
}
