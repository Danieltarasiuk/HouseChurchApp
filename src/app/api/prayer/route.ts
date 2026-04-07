import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const prayers = await sql(
      `SELECT pr.id, pr.title, pr.description, pr.status, pr.is_private, pr.created_at,
              pr.user_id, u.name AS requester_name
       FROM prayer_requests pr
       LEFT JOIN users u ON pr.user_id = u.id
       ORDER BY pr.created_at DESC`
    );
    return NextResponse.json({ prayers });
  } catch (error) {
    console.error('Prayer error:', error);
    return NextResponse.json({ error: 'Failed to load prayers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { title: string; description: string; is_private: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, description, is_private } = body;
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  try {
    const result = await sql(
      `INSERT INTO prayer_requests (title, description, user_id, status, is_private)
       VALUES ($1, $2, $3, 'active', $4)
       RETURNING id, title, description, status, is_private, created_at, user_id`,
      [title.trim(), description?.trim() || '', session.user.id, is_private ? 1 : 0]
    );

    return NextResponse.json({ prayer: { ...result[0], requester_name: session.user.name } });
  } catch (error) {
    console.error('Create prayer error:', error);
    return NextResponse.json({ error: 'Failed to create prayer request' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id: number; status: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await sql(
      `UPDATE prayer_requests SET status = $1 WHERE id = $2 RETURNING id, status`,
      [body.status, body.id]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ prayer: result[0] });
  } catch (error) {
    console.error('Update prayer error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
