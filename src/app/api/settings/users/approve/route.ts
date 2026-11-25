import { NextResponse } from 'next/server';
import { sql, currentChurchId } from '@/lib/db';
import { requireViewer } from '@/lib/authz';
import { splitName } from '@/lib/memberLink';
import { inChurch } from '@/lib/churchRoute';

/**
 * Approve a pending (email/password) account and link it to a member.
 *
 *   POST { userId, memberId }   link to that existing, unlinked member
 *   POST { userId, create: true } create a new member from the account
 *
 * Admins only, for an account pending in THIS church (church_memberships).
 * Linking and activation happen in one statement, so an account is never
 * active without its member, and a member already linked to someone else (or
 * a user who is not pending here) changes nothing. The member must be in this
 * church (row-level security hides every other).
 */
async function handlePOST(request: Request) {
  const { viewer, error } = await requireViewer({ roles: ['admin'] });
  if (error) return error;

  let body: { userId?: unknown; memberId?: unknown; create?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const memberId = typeof body.memberId === 'string' ? body.memberId : '';
  const create = body.create === true;
  if (!userId || (!memberId && !create) || (memberId && create)) {
    return NextResponse.json({ error: 'Give userId and either memberId or create: true' }, { status: 400 });
  }

  const churchId = currentChurchId();
  const users = await sql(
    `SELECT u.id, u.name, u.email FROM users u
     JOIN church_memberships cm ON cm.user_id = u.id AND cm.church_id = $2 AND cm.status = 'pending'
     WHERE u.id::text = $1`,
    [userId, churchId]
  );
  if (users.length === 0) {
    return NextResponse.json({ error: 'No pending account with that id', reason: 'not_pending' }, { status: 409 });
  }

  let rows;
  if (memberId) {
    rows = await sql(
      `WITH linked AS (
         UPDATE members SET user_id = $1::uuid
         WHERE id::text = $2 AND user_id IS NULL AND is_active = true
           AND EXISTS (SELECT 1 FROM church_memberships
                        WHERE user_id = $1::uuid AND church_id = $3 AND status = 'pending')
         RETURNING id
       ), activated AS (
         UPDATE church_memberships SET status = 'active'
         WHERE user_id = $1::uuid AND church_id = $3 AND status = 'pending' AND EXISTS (SELECT 1 FROM linked)
         RETURNING user_id AS id
       )
       SELECT (SELECT id FROM linked) AS member_id, (SELECT id FROM activated) AS user_id`,
      [userId, memberId, churchId]
    );
  } else {
    const { first, last } = splitName(users[0].name, String(users[0].email).toLowerCase());
    rows = await sql(
      `WITH created AS (
         INSERT INTO members (church_id, user_id, first_name, last_name, email, group_id, is_active)
         SELECT $4, u.id, $2, $3, LOWER(u.email), NULL, true
         FROM users u
         JOIN church_memberships cm ON cm.user_id = u.id AND cm.church_id = $4 AND cm.status = 'pending'
         WHERE u.id = $1::uuid
         RETURNING id
       ), activated AS (
         UPDATE church_memberships SET status = 'active'
         WHERE user_id = $1::uuid AND church_id = $4 AND status = 'pending' AND EXISTS (SELECT 1 FROM created)
         RETURNING user_id AS id
       )
       SELECT (SELECT id FROM created) AS member_id, (SELECT id FROM activated) AS user_id`,
      [userId, first, last, churchId]
    );
  }

  if (!rows[0]?.member_id || !rows[0]?.user_id) {
    return NextResponse.json(
      { error: 'That member is not available to link (already linked, inactive or not found)', reason: 'member_unavailable' },
      { status: 409 }
    );
  }
  console.info(`Account ${userId} approved by ${viewer.userId}, linked to member ${rows[0].member_id}`);
  return NextResponse.json({ success: true, memberId: rows[0].member_id });
}

export const POST = inChurch(handlePOST);
