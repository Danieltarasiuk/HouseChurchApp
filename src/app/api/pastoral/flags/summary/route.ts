import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    let result;

    if (userRole === 'admin') {
      // Admins see all red flags
      result = await sql(
        `SELECT member_id::text, COUNT(*)::int AS red_count
         FROM member_flags
         WHERE flag_color = 'red' AND is_resolved = false
         GROUP BY member_id`
      );
    } else {
      // HC pastors see red flags they created OR for members in their HCs
      const myHcIds = await sql(
        `SELECT hc.id FROM house_churches hc
         JOIN members m ON hc.pastor_id = m.id
         WHERE m.user_id = $1`,
        [session.user.id]
      );
      const hcIds = myHcIds.map((r: Record<string, string>) => r.id);

      if (hcIds.length === 0) {
        result = await sql(
          `SELECT member_id::text, COUNT(*)::int AS red_count
           FROM member_flags
           WHERE flag_color = 'red' AND is_resolved = false AND created_by = $1
           GROUP BY member_id`,
          [session.user.id]
        );
      } else {
        const placeholders = hcIds.map((_: string, i: number) => `$${i + 2}`).join(',');
        result = await sql(
          `SELECT mf.member_id::text, COUNT(*)::int AS red_count
           FROM member_flags mf
           LEFT JOIN members mem ON mf.member_id = mem.id
           WHERE mf.flag_color = 'red' AND mf.is_resolved = false
             AND (mf.created_by = $1 OR mem.house_church_id IN (${placeholders}))
           GROUP BY mf.member_id`,
          [session.user.id, ...hcIds]
        );
      }
    }

    return NextResponse.json({ flags: result });
  } catch (error) {
    console.error('Flags summary error:', error);
    return NextResponse.json({ error: 'Failed to load flag summary' }, { status: 500 });
  }
}
