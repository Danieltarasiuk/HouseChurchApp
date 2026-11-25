import { NextRequest, NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { sql } from '@/lib/db';
import { inChurch } from '@/lib/churchRoute';

async function handlePATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const { id } = await params;

  try {
    // Only the original pastor can edit notes
    const existing = await sql(
      'SELECT pastor_id FROM pastoral_meetings WHERE id = $1',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing[0].pastor_id !== viewer.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { notes } = await req.json();

    await sql(
      'UPDATE pastoral_meetings SET notes = $1 WHERE id = $2',
      [notes || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pastoral meeting PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
  }
}

async function handleDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const { id } = await params;

  try {
    const existing = await sql(
      'SELECT pastor_id FROM pastoral_meetings WHERE id = $1',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing[0].pastor_id !== viewer.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await sql('DELETE FROM pastoral_meetings WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pastoral meeting DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}

export const PATCH = inChurch(handlePATCH);
export const DELETE = inChurch(handleDELETE);
