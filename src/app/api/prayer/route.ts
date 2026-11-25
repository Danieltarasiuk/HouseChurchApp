import { NextResponse } from 'next/server';
import { sql, currentChurchId } from '@/lib/db';
import { requireViewer, forbidden, isAdmin, leadsGroup } from '@/lib/authz';
import { canSeePrayer } from '@/lib/prayerVisibility';
import { inChurch } from '@/lib/churchRoute';

async function handleGET() {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  try {
    const prayers = await sql(
      `SELECT pr.id, pr.title, pr.description, pr.status, pr.visibility,
              pr.group_id, pr.member_id, pr.created_at,
              pr.user_id, u.name AS requester_name,
              m.first_name || ' ' || m.last_name AS member_name
       FROM prayer_requests pr
       LEFT JOIN users u ON pr.user_id = u.id
       LEFT JOIN members m ON pr.member_id = m.id
       ORDER BY pr.created_at DESC`
    );

    const visible = prayers.filter((p) =>
      canSeePrayer(viewer, { user_id: p.user_id, visibility: p.visibility, group_id: p.group_id })
    );
    return NextResponse.json({ prayers: visible });
  } catch (err) {
    console.error('Prayer error:', err);
    return NextResponse.json({ error: 'Failed to load prayers' }, { status: 500 });
  }
}

async function handlePOST(request: Request) {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  try {
    const body = await request.json();
    // group_id from the client is ignored: it is always taken from
    // the member the request is for, so nobody can file into another group.
    const { title, description, visibility } = body;
    const member_id: string | null = typeof body.member_id === 'string' && body.member_id ? body.member_id : null;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const vis = visibility || 'public';
    if (!['public', 'group', 'private'].includes(vis)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }

    // "On behalf of" another member: admins for anyone, pastors only for
    // members of their own group, members only for themselves.
    let resolvedGroupId: string | null;
    let resolvedVis = vis;
    if (member_id && member_id !== viewer.memberId) {
      const target = await sql(
        'SELECT group_id FROM members WHERE id::text = $1 AND is_active = true LIMIT 1',
        [member_id]
      );
      if (target.length === 0) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }
      resolvedGroupId = target[0].group_id ?? null;
      if (!isAdmin(viewer) && !leadsGroup(viewer, resolvedGroupId)) return forbidden();
    } else {
      resolvedGroupId = viewer.groupId;
    }
    if (vis === 'group' && !resolvedGroupId) {
      // Graceful fallback: if no group found, save as public instead of rejecting
      resolvedVis = 'public';
    }

    const result = await sql(
      `INSERT INTO prayer_requests (church_id, title, description, user_id, member_id, status, visibility, group_id)
       VALUES ($7, $1, $2, $3, $4, 'active', $5, $6)
       RETURNING id, title, description, status, visibility, group_id, member_id, created_at, user_id`,
      [title.trim(), description?.trim() || null, viewer.userId, member_id, resolvedVis, resolvedGroupId, currentChurchId()]
    );

    // Resolve member_name for the response if on-behalf
    let memberName = null;
    if (member_id) {
      const mRow = await sql(
        "SELECT first_name || ' ' || last_name AS name FROM members WHERE id = $1",
        [member_id]
      );
      memberName = mRow[0]?.name || null;
    }

    const me = await sql('SELECT name FROM users WHERE id = $1', [viewer.userId]);
    return NextResponse.json({ prayer: { ...result[0], requester_name: me[0]?.name ?? null, member_name: memberName } });
  } catch (error) {
    // Log the real error; never send database text to the browser.
    console.error('Create prayer error:', error);
    return NextResponse.json({ error: 'Failed to create prayer request', reason: 'save_failed' }, { status: 500 });
  }
}

async function handlePATCH(request: Request) {
  const { viewer, error } = await requireViewer();
  if (error) return error;

  try {
    const body = await request.json();
    const { id, status, visibility } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Check ownership or role
    const existing = await sql('SELECT user_id, group_id FROM prayer_requests WHERE id::text = $1', [String(id)]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Owner, admins, and the pastor of the request's group only.
    const isOwner = existing[0].user_id === viewer.userId;
    if (!isOwner && !isAdmin(viewer) && !leadsGroup(viewer, existing[0].group_id)) {
      return forbidden();
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (status) {
      if (!['active', 'answered'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.push(`status = $${paramIdx++}`);
      params.push(status);
    }
    if (visibility) {
      if (!['public', 'group', 'private'].includes(visibility)) {
        return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
      }
      updates.push(`visibility = $${paramIdx++}`);
      params.push(visibility);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    params.push(id);
    const result = await sql(
      `UPDATE prayer_requests SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING id, status, visibility`,
      params
    );

    return NextResponse.json({ prayer: result[0] });
  } catch (error) {
    console.error('Update prayer error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
export const POST = inChurch(handlePOST);
export const PATCH = inChurch(handlePATCH);
