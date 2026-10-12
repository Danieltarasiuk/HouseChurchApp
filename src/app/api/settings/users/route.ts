import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

const VALID_ROLES = ['member', 'house_church_pastor', 'admin'];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await sql(
      'SELECT id, name, email, role FROM users ORDER BY name ASC'
    );
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Settings users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  try {
    const result = await sql(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, userId]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

/**
 * Removes a user account. The person's member profile (PCO-synced) is kept
 * and detached; shared records they produced are preserved where they make
 * sense without an author (attendance sessions, prayer requests) or handed
 * to the acting admin (member flags); their personal data (progress,
 * private pastoral notes, meeting log, PCO token) is deleted.
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
  if (userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove your own account' }, { status: 400 });
  }

  try {
    const existing = await sql('SELECT id FROM users WHERE id = $1', [userId]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Detach records that outlive the account…
    await sql('UPDATE members SET user_id = NULL WHERE user_id = $1', [userId]);
    await sql('UPDATE attendance_sessions SET recorded_by = NULL WHERE recorded_by = $1', [userId]);
    await sql('UPDATE prayer_requests SET user_id = NULL WHERE user_id = $1', [userId]);
    await sql('UPDATE incubator_access SET granted_by = NULL WHERE granted_by = $1', [userId]);
    // …keep member flags alive under the acting admin (created_by is NOT NULL)…
    await sql('UPDATE member_flags SET created_by = $2 WHERE created_by = $1', [userId, session.user.id]);
    // …and delete what is personal to the account.
    await sql('DELETE FROM incubator_access WHERE user_id = $1', [userId]);
    await sql('DELETE FROM discipleship_progress WHERE user_id = $1', [userId]);
    await sql('DELETE FROM incubator_progress WHERE user_id = $1', [userId]);
    await sql('DELETE FROM pastoral_notes WHERE pastor_id = $1', [userId]);
    await sql('DELETE FROM pastoral_meetings WHERE pastor_id = $1', [userId]);
    // pco_tokens has ON DELETE CASCADE
    await sql('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove user error:', error);
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
  }
}
