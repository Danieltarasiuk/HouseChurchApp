import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [churches, members, prayers, recentPrayers] = await Promise.all([
      sql('SELECT COUNT(*) as count FROM house_churches WHERE is_active = true'),
      sql('SELECT COUNT(*) as count FROM members WHERE is_active = true'),
      sql("SELECT COUNT(*) as count FROM prayer_requests WHERE status = 'active'"),
      sql("SELECT pr.id, pr.title, pr.status, pr.created_at, u.name as requester_name FROM prayer_requests pr LEFT JOIN users u ON pr.user_id = u.id ORDER BY pr.created_at DESC LIMIT 5"),
    ]);

    return NextResponse.json({
      churchCount: Number(churches[0]?.count ?? 0),
      memberCount: Number(members[0]?.count ?? 0),
      prayerCount: Number(prayers[0]?.count ?? 0),
      recentPrayers: recentPrayers ?? [],
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
