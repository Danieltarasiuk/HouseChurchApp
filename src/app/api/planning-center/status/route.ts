import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireViewer } from '@/lib/authz';
import { getPcoSyncUserId, getValidPcoToken, verifyPcoToken } from '@/lib/pco';
import { inChurch } from '@/lib/churchRoute';

/**
 * The Planning Center connection the sync actually uses (the cron's token,
 * see getPcoSyncUserId), so every admin sees the real state, plus whose
 * connection it is. Admins only: it names an admin.
 */
async function handleGET() {
  const { error } = await requireViewer({ roles: ['admin'] });
  if (error) return error;

  try {
    const userId = await getPcoSyncUserId();
    if (!userId) return NextResponse.json({ connected: false });

    const owner = await sql('SELECT name, email FROM users WHERE id = $1', [userId]);
    const connectedBy = owner[0] ? { name: owner[0].name as string, email: owner[0].email as string } : null;

    const result = await getValidPcoToken(userId);
    if (result.error) {
      return NextResponse.json({
        connected: false,
        connectedBy,
        ...(result.error !== 'not_connected' ? { reason: result.error } : {}),
      });
    }

    const check = await verifyPcoToken(result.token);
    if (!check.ok) return NextResponse.json({ connected: false, connectedBy, reason: check.error });

    return NextResponse.json({ connected: true, connectedBy });
  } catch {
    return NextResponse.json({ connected: false, reason: 'pco_unavailable' });
  }
}

export const GET = inChurch(handleGET);
