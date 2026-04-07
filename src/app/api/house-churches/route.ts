import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const churches = await sql(
      `SELECT hc.id, hc.name, hc.description, hc.meeting_day, hc.meeting_time,
              hc.location, u.name AS pastor_name,
              (SELECT COUNT(*) FROM members m WHERE m.house_church_id = hc.id AND m.is_active = true)::int AS member_count
       FROM house_churches hc
       LEFT JOIN users u ON hc.pastor_id = u.id
       WHERE hc.is_active = true
       ORDER BY hc.name`
    );
    return NextResponse.json({ churches });
  } catch (error) {
    console.error('House churches error:', error);
    return NextResponse.json({ error: 'Failed to load house churches' }, { status: 500 });
  }
}
