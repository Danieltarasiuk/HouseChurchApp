import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer } from '@/lib/authz';
import { canSeePrayer } from '@/lib/prayerVisibility';

const RECENT_PRAYERS = 5;

export async function GET() {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  try {
    const [churches, members, prayers] = await Promise.all([
      sql('SELECT COUNT(*) as count FROM house_churches WHERE is_active = true'),
      sql('SELECT COUNT(*) as count FROM members WHERE is_active = true'),
      // Filtered in code with the same rule as /api/prayer, so a private or
      // house-church request never reaches someone who can't open it.
      sql(
        `SELECT pr.id, pr.title, pr.status, pr.created_at, pr.user_id, pr.visibility, pr.house_church_id,
                u.name AS requester_name
         FROM prayer_requests pr LEFT JOIN users u ON pr.user_id = u.id
         ORDER BY pr.created_at DESC`
      ),
    ]);

    const visible = prayers.filter((p) =>
      canSeePrayer(viewer, { user_id: p.user_id, visibility: p.visibility, house_church_id: p.house_church_id })
    );

    return NextResponse.json({
      churchCount: Number(churches[0]?.count ?? 0),
      memberCount: Number(members[0]?.count ?? 0),
      prayerCount: visible.filter((p) => p.status === 'active').length,
      recentPrayers: visible.slice(0, RECENT_PRAYERS).map((p) => ({
        id: p.id, title: p.title, status: p.status, created_at: p.created_at, requester_name: p.requester_name,
      })),
    });
  } catch (err) {
    console.error('Dashboard data error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
