import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer, forbidden, leadsGroup, leaderGroupScope, LEADER_ROLES } from '@/lib/authz';
import { loadVisibilitySettings, redactMember } from '@/lib/directory';
import { todayInChurchTz } from '@/lib/churchTime';

/** Normalize a Postgres DATE value (Date object or ISO string) to 'YYYY-MM-DD' */
function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return String(v).split('T')[0];
}

export async function GET(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;
  const userRole = viewer.role;
  const userId = viewer.userId;

  // Pastors: their own groups only, and an explicit filter must be
  // one of them. A pastor linked to no group gets an empty list.
  const scope = leaderGroupScope(viewer);
  const groupFilter = req.nextUrl.searchParams.get('group_id');
  if (scope && groupFilter && !leadsGroup(viewer, groupFilter)) return forbidden();
  if (scope && scope.length === 0) return NextResponse.json({ members: [] });

  try {
    const myGroupIdSet = new Set(viewer.ledGroupIds);

    // Build member query with filters
    let memberQuery = `
      SELECT m.id, m.first_name || ' ' || m.last_name AS name,
             COALESCE(m.email, '') AS email,
             COALESCE(u.role, m.role, 'member') AS role,
             m.group_id, hc.name AS group_name,
             m.user_id, m.date_of_birth,
             m.pco_household_id, m.household_name, m.attendance_note
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN groups hc ON m.group_id = hc.id
      WHERE m.is_active = true
    `;
    const queryParams: string[] = [];

    if (groupFilter) {
      queryParams.push(groupFilter);
      memberQuery += ` AND m.group_id = $${queryParams.length}`;
    } else if (scope) {
      // Pastor with no filter: all of their own groups
      queryParams.push(`{${scope.join(',')}}`);
      memberQuery += ` AND m.group_id::text = ANY($${queryParams.length}::text[])`;
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

    // Build last_meetings map (normalize dates to YYYY-MM-DD)
    const meetingMap = new Map<string, Record<string, string>>();
    for (const m of meetings) {
      if (!meetingMap.has(m.member_id)) meetingMap.set(m.member_id, {});
      meetingMap.get(m.member_id)![m.topic_key] = toDateStr(m.meeting_date);
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
      lastContactedMap.set(lc.member_id, toDateStr(lc.last_date));
    }

    // Get flag counts
    // Yellow flags: only those created by current user
    const yellowFlags = await sql(
      `SELECT member_id::text, COUNT(*)::int AS cnt
       FROM member_flags
       WHERE member_id IN (${meetingPlaceholders})
         AND flag_color = 'yellow' AND is_resolved = false AND created_by = $${memberIds.length + 1}
       GROUP BY member_id`,
      [...memberIds, userId]
    );
    const yellowMap = new Map<string, number>();
    for (const yf of yellowFlags) yellowMap.set(yf.member_id, yf.cnt);

    // Red flags: created by current user, or admin sees all, or group leader sees their members'
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
      // group leader: flags they created + flags on their group members
      const groupMemberIds = members
        .filter((m: Record<string, string>) => myGroupIdSet.has(m.group_id))
        .map((m: Record<string, string>) => m.id);

      if (groupMemberIds.length > 0) {
        const groupPlaceholders = groupMemberIds.map((_: string, i: number) => `$${i + memberIds.length + 2}`).join(',');
        redFlags = await sql(
          `SELECT member_id::text, COUNT(*)::int AS cnt
           FROM member_flags
           WHERE member_id IN (${meetingPlaceholders})
             AND flag_color = 'red' AND is_resolved = false
             AND (created_by = $${memberIds.length + 1} OR member_id IN (${groupPlaceholders}))
           GROUP BY member_id`,
          [...memberIds, userId, ...groupMemberIds]
        );
      } else {
        redFlags = await sql(
          `SELECT member_id::text, COUNT(*)::int AS cnt
           FROM member_flags
           WHERE member_id IN (${meetingPlaceholders})
             AND flag_color = 'red' AND is_resolved = false AND created_by = $${memberIds.length + 1}
           GROUP BY member_id`,
          [...memberIds, userId]
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
      group_id: m.group_id,
      group_name: m.group_name,
      user_id: m.user_id,
      pco_household_id: m.pco_household_id,
      household_name: m.household_name,
      attendance_note: m.attendance_note,
      date_of_birth: m.date_of_birth ? (m.date_of_birth instanceof Date ? m.date_of_birth.toISOString().split('T')[0] : String(m.date_of_birth).split('T')[0]) : null,
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

    // Same directory rules as /api/members. After the scoping above the
    // viewer is an admin or this member's pastor, so this removes nothing
    // today; it keeps one code path deciding what member data leaves.
    const settings = await loadVisibilitySettings();
    const today = todayInChurchTz();
    return NextResponse.json({
      members: result.map((m: Record<string, unknown> & { id: string; group_id: string | null }) =>
        redactMember(viewer, m, settings, today)),
    });
  } catch (error) {
    console.error('Pastoral members error:', error);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}
