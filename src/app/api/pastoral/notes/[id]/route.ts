import { NextRequest, NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { sql } from '@/lib/db';
import { inChurch } from '@/lib/churchRoute';

async function handlePATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const { id } = await params;

  try {
    // Only the pastor who created the note can edit it
    const existing = await sql(
      'SELECT pastor_id FROM pastoral_notes WHERE id = $1',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing[0].pastor_id !== viewer.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const result = await sql(
      'UPDATE pastoral_notes SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING id, content, created_at, updated_at',
      [content.trim(), id]
    );

    return NextResponse.json({ note: result[0] });
  } catch (error) {
    console.error('Pastoral note PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

async function handleDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const { id } = await params;

  try {
    // Only the pastor who created the note can delete it
    const existing = await sql(
      'SELECT pastor_id FROM pastoral_notes WHERE id = $1',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing[0].pastor_id !== viewer.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await sql('DELETE FROM pastoral_notes WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pastoral note DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}

export const PATCH = inChurch(handlePATCH);
export const DELETE = inChurch(handleDELETE);
