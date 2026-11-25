import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer } from '@/lib/authz';
import { splitName } from '@/lib/memberLink';

/**
 * Approve a pending (email/password) account and link it to a member.
 *
 *   POST { userId, memberId }   link to that existing, unlinked member
 *   POST { userId, create: true } create a new member from the account
 *
 * Admins only. Linking and activation happen in one statement, so an account
 * is never active without its member, and a member already linked to someone
 * else (or a user who is not pending) changes nothing.
 */
export async function POST(request: Request) {
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

  const users = await sql("SELECT id, name, email FROM users WHERE id::text = $1 AND status = 'pending'", [userId]);
  if (users.length === 0) {
    return NextResponse.json({ error: 'No pending account with that id', reason: 'not_pending' }, { status: 409 });
  }

  let rows;
  if (memberId) {
    rows = await sql(
      `WITH linked AS (
         UPDATE members SET user_id = $1::uuid
         WHERE id::text = $2 AND user_id IS NULL AND is_active = true
           AND EXISTS (SELECT 1 FROM users WHERE id = $1::uuid AND status = 'pending')
         RETURNING id
       ), activated AS (
         UPDATE users SET status = 'active', updated_at = now()
         WHERE id = $1::uuid AND status = 'pending' AND EXISTS (SELECT 1 FROM linked)
         RETURNING id
       )
       SELECT (SELECT id FROM linked) AS member_id, (SELECT id FROM activated) AS user_id`,
      [userId, memberId]
    );
  } else {
    const { first, last } = splitName(users[0].name, String(users[0].email).toLowerCase());
    rows = await sql(
      `WITH created AS (
         INSERT INTO members (user_id, first_name, last_name, email, house_church_id, is_active)
         SELECT id, $2, $3, LOWER(email), NULL, true FROM users WHERE id = $1::uuid AND status = 'pending'
         RETURNING id
       ), activated AS (
         UPDATE users SET status = 'active', updated_at = now()
         WHERE id = $1::uuid AND status = 'pending' AND EXISTS (SELECT 1 FROM created)
         RETURNING id
       )
       SELECT (SELECT id FROM created) AS member_id, (SELECT id FROM activated) AS user_id`,
      [userId, first, last]
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
