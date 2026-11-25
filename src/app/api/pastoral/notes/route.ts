import { NextRequest, NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { sql, currentChurchId } from '@/lib/db';
import { inChurch } from '@/lib/churchRoute';

async function handleGET(req: NextRequest) {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const userRole = viewer.role;
  if (userRole !== 'admin' && userRole !== 'group_leader') {
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
      [viewer.userId, memberId]
    );

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Pastoral notes GET error:', error);
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
  }
}

async function handlePOST(req: NextRequest) {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const userRole = viewer.role;
  if (userRole !== 'admin' && userRole !== 'group_leader') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { member_id, content } = await req.json();

    if (!member_id || !content?.trim()) {
      return NextResponse.json({ error: 'member_id and content are required' }, { status: 400 });
    }
    // The member must be in this church (row-level security hides the rest).
    const member = await sql('SELECT 1 FROM members WHERE id::text = $1', [String(member_id)]);
    if (member.length === 0) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const result = await sql(
      `INSERT INTO pastoral_notes (church_id, pastor_id, member_id, content)
       VALUES ($4, $1, $2, $3)
       RETURNING id, content, created_at, updated_at`,
      [viewer.userId, member_id, content.trim(), currentChurchId()]
    );

    return NextResponse.json({ note: result[0] });
  } catch (error) {
    console.error('Pastoral notes POST error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

export const GET = inChurch(handleGET);
export const POST = inChurch(handlePOST);
