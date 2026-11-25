import { NextRequest, NextResponse } from 'next/server';
import { sql, currentChurchId } from '@/lib/db';
import { requireViewer, forbidden, leadsMemberIn, leaderGroupScope, memberGroups, LEADER_ROLES } from '@/lib/authz';
import { inChurch } from '@/lib/churchRoute';

/** Normalize a Postgres DATE value (Date object or ISO string) to 'YYYY-MM-DD' */
function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return String(v).split('T')[0];
}

async function handleGET(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;

  const memberId = req.nextUrl.searchParams.get('member_id');
  // Pastors: members of their own group only (admins: everyone).
  if (memberId) {
    const hcs = await memberGroups([memberId]);
    if (!hcs.has(memberId) || !leadsMemberIn(viewer, hcs.get(memberId))) return forbidden();
  }
  const scope = leaderGroupScope(viewer);

  try {
    let meetings;

    if (memberId) {
      // Fetch all meetings for a specific member (used by detail panel).
      // Notes are included only for meetings logged by the current pastor;
      // other pastors' notes are nulled out (privacy enforced server-side).
      const rows = await sql(
        `SELECT pm.id, pm.member_id, pm.topic_key, pm.meeting_date, pm.notes, pm.created_at,
                pm.pastor_id, u.name AS pastor_name,
                m.first_name || ' ' || m.last_name AS member_name
         FROM pastoral_meetings pm
         JOIN members m ON pm.member_id = m.id
         LEFT JOIN users u ON pm.pastor_id = u.id
         WHERE pm.member_id = $1
         ORDER BY pm.meeting_date DESC`,
        [memberId]
      );
      // Redact notes from other pastors, normalize dates
      meetings = rows.map((r: Record<string, string>) => ({
        ...r,
        meeting_date: toDateStr(r.meeting_date),
        notes: r.pastor_id === viewer.userId ? r.notes : null,
      }));
    } else {
      // Default: return only the current pastor's meetings
      const rows = await sql(
        `SELECT pm.id, pm.member_id, pm.topic_key, pm.meeting_date, pm.notes, pm.created_at,
                pm.pastor_id, u.name AS pastor_name,
                m.first_name || ' ' || m.last_name AS member_name
         FROM pastoral_meetings pm
         JOIN members m ON pm.member_id = m.id
         LEFT JOIN users u ON pm.pastor_id = u.id
         WHERE pm.pastor_id = $1
           AND ($2::text[] IS NULL OR m.group_id::text = ANY($2::text[]))
         ORDER BY pm.meeting_date DESC`,
        [viewer.userId, scope]
      );
      meetings = rows.map((r: Record<string, string>) => ({
        ...r,
        meeting_date: toDateStr(r.meeting_date),
      }));
    }

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Pastoral meetings GET error:', error);
    return NextResponse.json({ error: 'Failed to load meetings' }, { status: 500 });
  }
}

async function handlePOST(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;

  try {
    const { member_id, topic_key, meeting_date, notes } = await req.json();

    if (!member_id || !topic_key || !meeting_date) {
      return NextResponse.json({ error: 'member_id, topic_key, and meeting_date are required' }, { status: 400 });
    }

    const hcs = await memberGroups([String(member_id)]);
    if (!hcs.has(String(member_id)) || !leadsMemberIn(viewer, hcs.get(String(member_id)))) return forbidden();

    const result = await sql(
      `INSERT INTO pastoral_meetings (church_id, pastor_id, member_id, topic_key, meeting_date, notes)
       VALUES ($6, $1, $2, $3, $4, $5)
       RETURNING id, pastor_id, member_id, topic_key, meeting_date, notes, created_at`,
      [viewer.userId, member_id, topic_key, meeting_date, notes || null, currentChurchId()]
    );

    const meeting = { ...result[0], meeting_date: toDateStr(result[0].meeting_date) };
    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error('Pastoral meetings POST error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
export const POST = inChurch(handlePOST);
