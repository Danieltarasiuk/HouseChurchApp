import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userRole = (session.user as { role?: string }).role;

  try {
    const existing = await sql('SELECT user_id FROM prayer_requests WHERE id = $1', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = existing[0].user_id === session.user.id;
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
