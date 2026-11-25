import { NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { sql } from '@/lib/db';
import { inChurch } from '@/lib/churchRoute';

async function handleGET() {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const userRole = viewer.role;
  if (userRole !== 'admin' && userRole !== 'group_leader') {
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
      // group leaders see red flags they created OR for members in their groups
      const myGroupIds = await sql(
        `SELECT hc.id FROM groups hc
         JOIN members m ON hc.pastor_id = m.id
         WHERE m.user_id = $1`,
        [viewer.userId]
      );
      const groupIds = myGroupIds.map((r: Record<string, string>) => r.id);

      if (groupIds.length === 0) {
        result = await sql(
          `SELECT member_id::text, COUNT(*)::int AS red_count
           FROM member_flags
           WHERE flag_color = 'red' AND is_resolved = false AND created_by = $1
           GROUP BY member_id`,
          [viewer.userId]
        );
      } else {
        const placeholders = groupIds.map((_: string, i: number) => `$${i + 2}`).join(',');
        result = await sql(
          `SELECT mf.member_id::text, COUNT(*)::int AS red_count
           FROM member_flags mf
           LEFT JOIN members mem ON mf.member_id = mem.id
           WHERE mf.flag_color = 'red' AND mf.is_resolved = false
             AND (mf.created_by = $1 OR mem.group_id IN (${placeholders}))
           GROUP BY mf.member_id`,
          [viewer.userId, ...groupIds]
        );
      }
    }

    return NextResponse.json({ flags: result });
  } catch (error) {
    console.error('Flags summary error:', error);
    return NextResponse.json({ error: 'Failed to load flag summary' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
