import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

const VALID_ROLES = ['member', 'house_church_pastor', 'senior_pastor'];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'senior_pastor') {
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
  if (userRole !== 'senior_pastor') {
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
