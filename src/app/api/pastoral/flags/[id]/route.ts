import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userRole = (session.user as { role?: string }).role;

  try {
    const existing = await sql(
      'SELECT created_by FROM member_flags WHERE id = $1',
      [id]
    );
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only creator or admin can resolve
    if (existing[0].created_by !== session.user.id && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { is_resolved } = await req.json();
    if (!is_resolved) {
      return NextResponse.json({ error: 'is_resolved must be true' }, { status: 400 });
    }

    await sql(
      'UPDATE member_flags SET is_resolved = true, resolved_at = NOW() WHERE id = $1',
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Flag PATCH error:', error);
    return NextResponse.json({ error: 'Failed to resolve flag' }, { status: 500 });
  }
}
