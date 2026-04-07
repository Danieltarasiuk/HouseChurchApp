import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin' && userRole !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const meetings = await sql(
      `SELECT pm.id, pm.member_id, pm.topic_key, pm.meeting_date, pm.notes, pm.created_at,
              pm.pastor_id, u.name AS pastor_name,
              m.first_name || ' ' || m.last_name AS member_name
       FROM pastoral_meetings pm
       JOIN members m ON pm.member_id = m.id
       LEFT JOIN users u ON pm.pastor_id = u.id
       WHERE pm.pastor_id = $1
       ORDER BY pm.meeting_date DESC`,
      [session.user.id]
    );
    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Pastoral meetings GET error:', error);
    return NextResponse.json({ error: 'Failed to load meetings' }, { status: 500 });
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
    const { member_id, topic_key, meeting_date, notes } = await req.json();

    if (!member_id || !topic_key || !meeting_date) {
      return NextResponse.json({ error: 'member_id, topic_key, and meeting_date are required' }, { status: 400 });
    }

    const result = await sql(
      `INSERT INTO pastoral_meetings (pastor_id, member_id, topic_key, meeting_date, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, pastor_id, member_id, topic_key, meeting_date, notes, created_at`,
      [session.user.id, member_id, topic_key, meeting_date, notes || null]
    );

    return NextResponse.json({ success: true, meeting: result[0] });
  } catch (error) {
    console.error('Pastoral meetings POST error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
