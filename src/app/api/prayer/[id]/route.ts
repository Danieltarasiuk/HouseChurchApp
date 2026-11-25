import { NextRequest, NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { sql } from '@/lib/db';
import { inChurch } from '@/lib/churchRoute';

async function handleDELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const { id } = await params;
  const userRole = viewer.role;

  try {
    const existing = await sql('SELECT user_id FROM prayer_requests WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = existing[0].user_id === viewer.userId;
    if (!isOwner && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await sql('DELETE FROM prayer_requests WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete prayer error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}

export const DELETE = inChurch(handleDELETE);
