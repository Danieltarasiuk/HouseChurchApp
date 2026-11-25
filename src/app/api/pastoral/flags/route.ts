import { NextRequest, NextResponse } from 'next/server';
import { sql, currentChurchId } from '@/lib/db';
import { requireViewer, forbidden, leadsMemberIn, memberGroups, LEADER_ROLES } from '@/lib/authz';
import { inChurch } from '@/lib/churchRoute';

async function handleGET(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;

  const memberId = req.nextUrl.searchParams.get('member_id');
  if (!memberId) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
  }

  // Pastors: members of their own group only (admins: everyone).
  const hcs = await memberGroups([memberId]);
  if (!hcs.has(memberId) || !leadsMemberIn(viewer, hcs.get(memberId))) return forbidden();

  try {

    const flags = await sql(
      `SELECT mf.id, mf.member_id, mf.flag_color, mf.description, mf.created_at,
              mf.created_by, u.name AS created_by_name
       FROM member_flags mf
       LEFT JOIN users u ON mf.created_by = u.id
       WHERE mf.member_id = $1 AND mf.is_resolved = false
       ORDER BY CASE WHEN mf.flag_color = 'red' THEN 0 ELSE 1 END, mf.created_at DESC`,
      [memberId]
    );

    // Filter by visibility rules
    const visible = flags.filter((f: Record<string, string>) => {
      // Yellow flags are private to their author; red flags are shared with
      // admins and the member's pastor (who, after the check above, is the viewer).
      if (f.created_by === viewer.userId) return true;
      return f.flag_color === 'red';
    });

    return NextResponse.json({ flags: visible });
  } catch (error) {
    console.error('Flags GET error:', error);
    return NextResponse.json({ error: 'Failed to load flags' }, { status: 500 });
  }
}

async function handlePOST(req: NextRequest) {
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;

  try {
    const { member_id, flag_color, description } = await req.json();

    if (!member_id || !flag_color || !description?.trim()) {
      return NextResponse.json({ error: 'member_id, flag_color, and description are required' }, { status: 400 });
    }

    if (!['yellow', 'red'].includes(flag_color)) {
      return NextResponse.json({ error: 'Invalid flag_color' }, { status: 400 });
    }

    const hcs = await memberGroups([String(member_id)]);
    if (!hcs.has(String(member_id)) || !leadsMemberIn(viewer, hcs.get(String(member_id)))) return forbidden();

    const result = await sql(
      `INSERT INTO member_flags (church_id, member_id, created_by, flag_color, description)
       VALUES ($5, $1, $2, $3, $4)
       RETURNING id, member_id, flag_color, description, created_at, created_by`,
      [member_id, viewer.userId, flag_color, description.trim(), currentChurchId()]
    );

    const me = await sql('SELECT name FROM users WHERE id = $1', [viewer.userId]);
    return NextResponse.json({ success: true, flag: { ...result[0], created_by_name: me[0]?.name ?? null } });
  } catch (error) {
    console.error('Flags POST error:', error);
    return NextResponse.json({ error: 'Failed to create flag' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
export const POST = inChurch(handlePOST);
