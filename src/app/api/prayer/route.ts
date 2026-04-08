import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;

  try {
    // Get house churches where current user is pastor
    const myHcIds = await sql(
      `SELECT hc.id FROM house_churches hc
       JOIN members m ON hc.pastor_id = m.id
       WHERE m.user_id = $1`,
      [session.user.id]
    );
    const hcIdSet = new Set(myHcIds.map((r: Record<string, string>) => r.id));

    // Get current user's house church (from members table)
    const myMember = await sql(
      'SELECT house_church_id FROM members WHERE user_id = $1 AND is_active = true LIMIT 1',
      [session.user.id]
    );
    const myHcId = myMember[0]?.house_church_id;

    const prayers = await sql(
      `SELECT pr.id, pr.title, pr.description, pr.status, pr.visibility,
              pr.house_church_id, pr.member_id, pr.created_at,
              pr.user_id, u.name AS requester_name,
              m.first_name || ' ' || m.last_name AS member_name
       FROM prayer_requests pr
       LEFT JOIN users u ON pr.user_id = u.id
       LEFT JOIN members m ON pr.member_id = m.id
       ORDER BY pr.created_at DESC`
    );

    // Filter by visibility
    const visible = prayers.filter((p: Record<string, string>) => {
      // Creator always sees their own
      if (p.user_id === session.user!.id) return true;

      // Admins and HC pastors see everything in scope
      if (userRole === 'admin') return true;

      if (p.visibility === 'public') return true;

      if (p.visibility === 'house_church') {
        // Same house church
        if (myHcId && p.house_church_id === myHcId) return true;
        // HC pastor for this HC
        if (p.house_church_id && hcIdSet.has(p.house_church_id)) return true;
        return false;
      }

      if (p.visibility === 'private') {
        // HC pastor for the member's HC
        if (userRole === 'house_church_pastor' && p.house_church_id && hcIdSet.has(p.house_church_id)) return true;
        return false;
      }

      return false;
    });

    return NextResponse.json({ prayers: visible });
  } catch (error) {
    console.error('Prayer error:', error);
    return NextResponse.json({ error: 'Failed to load prayers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, visibility, house_church_id, member_id } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const vis = visibility || 'public';
    if (!['public', 'house_church', 'private'].includes(vis)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }

    // Resolve house_church_id:
    // - If submitting on behalf (member_id provided), resolve from target member's record
    // - Otherwise resolve from submitter's own member record
    let resolvedHcId = house_church_id || null;
    let resolvedVis = vis;
    if (!resolvedHcId) {
      try {
        let memberRow;
        if (member_id) {
          // On behalf: use target member's HC
          memberRow = await sql(
            'SELECT house_church_id FROM members WHERE id = $1 AND is_active = true LIMIT 1',
            [member_id]
          );
        } else {
          // For myself: use submitter's HC
          memberRow = await sql(
            'SELECT house_church_id FROM members WHERE user_id = $1 AND is_active = true LIMIT 1',
            [session.user.id]
          );
        }
        resolvedHcId = memberRow[0]?.house_church_id || null;
      } catch {
        resolvedHcId = null;
      }
    }
    if (vis === 'house_church' && !resolvedHcId) {
      // Graceful fallback: if no HC found, save as public instead of rejecting
      resolvedVis = 'public';
    }

    const result = await sql(
      `INSERT INTO prayer_requests (title, description, user_id, member_id, status, visibility, house_church_id)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       RETURNING id, title, description, status, visibility, house_church_id, member_id, created_at, user_id`,
      [title.trim(), description?.trim() || null, session.user.id, member_id || null, resolvedVis, resolvedHcId]
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

    return NextResponse.json({ prayer: { ...result[0], requester_name: session.user.name, member_name: memberName } });
  } catch (error) {
    console.error('Create prayer error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to create prayer request';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;

  try {
    const body = await request.json();
    const { id, status, visibility } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Check ownership or role
    const existing = await sql('SELECT user_id FROM prayer_requests WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = existing[0].user_id === session.user.id;
    const isPrivileged = userRole === 'admin' || userRole === 'house_church_pastor';

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      if (!['public', 'house_church', 'private'].includes(visibility)) {
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
