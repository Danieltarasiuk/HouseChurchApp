import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const hcFilter = req.nextUrl.searchParams.get('house_church_id');

  try {
    // Find house churches where current user is pastor
    const myHcIds = await sql(
      `SELECT hc.id FROM house_churches hc
       JOIN members m ON hc.pastor_id = m.id
       WHERE m.user_id = $1`,
      [session.user.id]
    );
    const myHcIdSet = new Set(myHcIds.map((r: Record<string, string>) => r.id));

    // Build member query with filters
    let memberQuery = `
      SELECT m.id, m.first_name || ' ' || m.last_name AS name,
             COALESCE(m.email, '') AS email,
             COALESCE(u.role, m.role, 'member') AS role,
             m.house_church_id, hc.name AS house_church_name,
             m.user_id
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN house_churches hc ON m.house_church_id = hc.id
      WHERE m.is_active = true
    `;
    const queryParams: string[] = [];

    if (hcFilter) {
      queryParams.push(hcFilter);
      memberQuery += ` AND m.house_church_id = $${queryParams.length}`;
    } else if (userRole === 'house_church_pastor' && myHcIds.length > 0) {
      // Default to own HC members
      const placeholders = myHcIds.map((_: Record<string, string>, i: number) => `$${i + 1}`).join(',');
      myHcIds.forEach((r: Record<string, string>) => queryParams.push(r.id));
      memberQuery += ` AND m.house_church_id IN (${placeholders})`;
    }

    memberQuery += ' ORDER BY m.first_name, m.last_name';

    const members = await sql(memberQuery, queryParams);

    if (members.length === 0) {
      return NextResponse.json({ members: [] });
    }

    const memberIds = members.map((m: Record<string, string>) => m.id);

    // Get latest meeting per member per topic
    const meetingPlaceholders = memberIds.map((_: string, i: number) => `$${i + 1}`).join(',');
    const meetings = await sql(
      `SELECT DISTINCT ON (member_id, topic_key)
              member_id::text, topic_key, meeting_date
       FROM pastoral_meetings
       WHERE member_id IN (${meetingPlaceholders})
       ORDER BY member_id, topic_key, meeting_date DESC`,
      memberIds
    );

    // Build last_meetings map
    const meetingMap = new Map<string, Record<string, string>>();
    for (const m of meetings) {
      if (!meetingMap.has(m.member_id)) meetingMap.set(m.member_id, {});
      meetingMap.get(m.member_id)![m.topic_key] = m.meeting_date;
    }

    // Get last contacted (most recent meeting across all topics)
    const lastContacted = await sql(
      `SELECT member_id::text, MAX(meeting_date) AS last_date
       FROM pastoral_meetings
       WHERE member_id IN (${meetingPlaceholders})
       GROUP BY member_id`,
      memberIds
    );
    const lastContactedMap = new Map<string, string>();
    for (const lc of lastContacted) {
      lastContactedMap.set(lc.member_id, lc.last_date);
    }

    // Get flag counts
    // Yellow flags: only those created by current user
    const yellowFlags = await sql(
      `SELECT member_id::text, COUNT(*)::int AS cnt
       FROM member_flags
       WHERE member_id IN (${meetingPlaceholders})
         AND flag_color = 'yellow' AND is_resolved = false AND created_by = $${memberIds.length + 1}
       GROUP BY member_id`,
      [...memberIds, session.user.id]
    );
    const yellowMap = new Map<string, number>();
    for (const yf of yellowFlags) yellowMap.set(yf.member_id, yf.cnt);

    // Red flags: created by current user, or admin sees all, or HC pastor sees their members'
    let redFlags;
    if (userRole === 'admin') {
      redFlags = await sql(
        `SELECT member_id::text, COUNT(*)::int AS cnt
         FROM member_flags
         WHERE member_id IN (${meetingPlaceholders})
           AND flag_color = 'red' AND is_resolved = false
         GROUP BY member_id`,
        memberIds
      );
    } else {
      // HC pastor: flags they created + flags on their HC members
      const hcMemberIds = members
        .filter((m: Record<string, string>) => myHcIdSet.has(m.house_church_id))
        .map((m: Record<string, string>) => m.id);

      if (hcMemberIds.length > 0) {
        const hcPlaceholders = hcMemberIds.map((_: string, i: number) => `$${i + memberIds.length + 2}`).join(',');
        redFlags = await sql(
          `SELECT member_id::text, COUNT(*)::int AS cnt
           FROM member_flags
           WHERE member_id IN (${meetingPlaceholders})
             AND flag_color = 'red' AND is_resolved = false
             AND (created_by = $${memberIds.length + 1} OR member_id IN (${hcPlaceholders}))
           GROUP BY member_id`,
          [...memberIds, session.user.id, ...hcMemberIds]
        );
      } else {
        redFlags = await sql(
          `SELECT member_id::text, COUNT(*)::int AS cnt
           FROM member_flags
           WHERE member_id IN (${meetingPlaceholders})
             AND flag_color = 'red' AND is_resolved = false AND created_by = $${memberIds.length + 1}
           GROUP BY member_id`,
          [...memberIds, session.user.id]
        );
      }
    }
    const redMap = new Map<string, number>();
    for (const rf of redFlags) redMap.set(rf.member_id, rf.cnt);

    // Assemble response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = members.map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      house_church_id: m.house_church_id,
      house_church_name: m.house_church_name,
      user_id: m.user_id,
      last_meetings: meetingMap.get(m.id) || {},
      last_contacted: lastContactedMap.get(m.id) || null,
      red_flag_count: redMap.get(m.id) || 0,
      yellow_flag_count: yellowMap.get(m.id) || 0,
    }));

    // Sort by last_contacted ASC NULLS FIRST
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.sort((a: any, b: any) => {
      if (!a.last_contacted && !b.last_contacted) return 0;
      if (!a.last_contacted) return -1;
      if (!b.last_contacted) return 1;
      return a.last_contacted.localeCompare(b.last_contacted);
    });

    return NextResponse.json({ members: result });
  } catch (error) {
    console.error('Pastoral members error:', error);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}
