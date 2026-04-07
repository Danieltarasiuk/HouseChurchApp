import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const memberId = req.nextUrl.searchParams.get('member_id');
  if (!memberId) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 });
  }

  try {
    // Only return notes created by the current pastor — never other pastors' notes
    const notes = await sql(
      `SELECT id, content, created_at, updated_at
       FROM pastoral_notes
       WHERE pastor_id = $1 AND member_id = $2
       ORDER BY updated_at DESC`,
      [session.user.id, memberId]
    );

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Pastoral notes GET error:', error);
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { member_id, content } = await req.json();

    if (!member_id || !content?.trim()) {
      return NextResponse.json({ error: 'member_id and content are required' }, { status: 400 });
    }

    const result = await sql(
      `INSERT INTO pastoral_notes (pastor_id, member_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at, updated_at`,
      [session.user.id, member_id, content.trim()]
    );

    return NextResponse.json({ note: result[0] });
  } catch (error) {
    console.error('Pastoral notes POST error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
