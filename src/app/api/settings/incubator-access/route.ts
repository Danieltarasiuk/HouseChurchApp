import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer } from '@/lib/authz';

/**
 * Grant or revoke Pastor Incubator access for a user (admins only).
 *
 *   PUT { userId, active: boolean }
 *
 * Uses the existing incubator_access row (one per user): a grant sets it
 * active and records who granted it and when; a revoke keeps the row,
 * inactive. Admins always have access, so they need no row.
 */
export async function PUT(request: Request) {
  const { viewer, error } = await requireViewer({ roles: ['admin'] });
  if (error) return error;

  let body: { userId?: unknown; active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  if (!userId || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Give userId and active (true/false)' }, { status: 400 });
  }

  const user = await sql("SELECT id FROM users WHERE id::text = $1 AND status = 'active'", [userId]);
  if (user.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (body.active) {
    await sql(
      `INSERT INTO incubator_access (user_id, granted_by, granted_at, is_active)
       VALUES ($1, $2, now(), true)
       ON CONFLICT (user_id) DO UPDATE SET is_active = true, granted_by = $2, granted_at = now()`,
      [userId, viewer.userId]
    );
  } else {
    await sql('UPDATE incubator_access SET is_active = false WHERE user_id = $1', [userId]);
  }
  return NextResponse.json({ success: true, active: body.active });
}
