import { NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { sql, currentChurchId } from '@/lib/db';
import { inChurch } from '@/lib/churchRoute';

const VALID_ROLES = ['member', 'group_leader', 'admin'];

/**
 * The accounts of this church: everyone with a membership here, with their
 * role and status in this church. (church_memberships has no row-level
 * security, so every query on it here names the church explicitly.)
 */
async function handleGET() {
  const { error: authError } = await requireViewer({ roles: ['admin'] });
  if (authError) return authError;

  try {
    const users = await sql(
      `SELECT u.id, u.name, u.email, cm.role, cm.status, u.created_at,
              CASE WHEN u.password_hash IS NULL THEN 'google' ELSE 'email' END AS signup_method,
              -- Pending accounts: the unlinked member with the same email, if
              -- any, as the suggested match. The admin still decides.
              (SELECT m.id FROM members m
               WHERE cm.status = 'pending' AND m.user_id IS NULL AND m.is_active = true
                 AND LOWER(m.email) = LOWER(u.email)
               ORDER BY m.joined_at NULLS LAST LIMIT 1) AS suggested_member_id,
              COALESCE((SELECT ia.is_active FROM incubator_access ia WHERE ia.user_id = u.id), false) AS incubator_access
       FROM church_memberships cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.church_id = $1
       ORDER BY (cm.status = 'pending') DESC, u.name ASC`,
      [currentChurchId()]
    );
    // Members an approval can link to: active and not linked to an account.
    const linkableMembers = await sql(
      `SELECT m.id, m.first_name, m.last_name, m.email, hc.name AS group_name
       FROM members m LEFT JOIN groups hc ON hc.id = m.group_id
       WHERE m.user_id IS NULL AND m.is_active = true
       ORDER BY m.first_name, m.last_name`
    );
    return NextResponse.json({ users, linkableMembers });
  } catch (error) {
    console.error('Settings users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

async function handlePATCH(request: Request) {
  const { viewer, error: authError } = await requireViewer({ roles: ['admin'] });
  if (authError) return authError;

  let body: { userId: string; role: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, role } = body;

  if (!userId || !role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
  }

  // Prevent demoting yourself
  if (userId === viewer.userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  try {
    const [membership] = await sql(
      'SELECT status FROM church_memberships WHERE user_id::text = $1 AND church_id = $2',
      [userId, currentChurchId()]
    );
    if (!membership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // A pending account must be approved first (it stays a plain member until
    // then; the database enforces this too).
    if (membership.status === 'pending') {
      return NextResponse.json({ error: 'Approve this account before changing its role', reason: 'pending' }, { status: 409 });
    }

    const result = await sql(
      `UPDATE church_memberships cm SET role = $1
       FROM users u
       WHERE u.id = cm.user_id AND cm.user_id::text = $2 AND cm.church_id = $3
       RETURNING u.id, u.name, u.email, cm.role, cm.status`,
      [role, userId, currentChurchId()]
    );

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

/**
 * Removes a user from this church. The person's member profile (PCO-synced)
 * is kept and detached; shared records they produced are preserved where
 * they make sense without an author (attendance sessions, prayer requests)
 * or handed to the acting admin (member flags); their personal data here
 * (progress, private pastoral notes, meeting log, PCO token) is deleted.
 * Row-level security keeps all of that inside this church. The account
 * itself is deleted only when it belongs to no other church.
 */
async function handleDELETE(request: Request) {
  const { viewer, error: authError } = await requireViewer({ roles: ['admin'] });
  if (authError) return authError;

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }
  if (userId === viewer.userId) {
    return NextResponse.json({ error: 'Cannot remove your own account' }, { status: 400 });
  }

  try {
    const churchId = currentChurchId();
    const existing = await sql(
      'SELECT 1 FROM church_memberships WHERE user_id::text = $1 AND church_id = $2',
      [userId, churchId]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Detach records that outlive the account…
    await sql('UPDATE members SET user_id = NULL WHERE user_id = $1', [userId]);
    await sql('UPDATE attendance_sessions SET recorded_by = NULL WHERE recorded_by = $1', [userId]);
    await sql('UPDATE prayer_requests SET user_id = NULL WHERE user_id = $1', [userId]);
    await sql('UPDATE incubator_access SET granted_by = NULL WHERE granted_by = $1', [userId]);
    await sql('UPDATE calendar_events SET created_by = NULL WHERE created_by = $1', [userId]);
    await sql('UPDATE directory_visibility SET updated_by = NULL WHERE updated_by = $1', [userId]);
    // …keep member flags alive under the acting admin (created_by is NOT NULL)…
    await sql('UPDATE member_flags SET created_by = $2 WHERE created_by = $1', [userId, viewer.userId]);
    // …and delete what is personal to the account.
    await sql('DELETE FROM incubator_access WHERE user_id = $1', [userId]);
    await sql('DELETE FROM discipleship_progress WHERE user_id = $1', [userId]);
    await sql('DELETE FROM incubator_progress WHERE user_id = $1', [userId]);
    await sql('DELETE FROM pastoral_notes WHERE pastor_id = $1', [userId]);
    await sql('DELETE FROM pastoral_meetings WHERE pastor_id = $1', [userId]);
    await sql('DELETE FROM pco_tokens WHERE user_id = $1', [userId]);
    await sql('DELETE FROM church_memberships WHERE user_id = $1 AND church_id = $2', [userId, churchId]);

    // The account goes too when nothing else holds it.
    const [rest] = await sql(
      `SELECT (SELECT count(*) FROM church_memberships WHERE user_id = $1)::int AS memberships,
              (SELECT is_platform_admin FROM users WHERE id = $1) AS platform_admin`,
      [userId]
    );
    if (rest.memberships === 0 && rest.platform_admin !== true) {
      await sql('DELETE FROM users WHERE id = $1', [userId]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove user error:', error);
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
export const PATCH = inChurch(handlePATCH);
export const DELETE = inChurch(handleDELETE);
