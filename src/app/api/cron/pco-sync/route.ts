import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import {
  getPcoSyncUserId,
  getValidPcoToken,
  runPcoSync,
  logSync,
  PCO_ERROR_MESSAGES,
} from '@/lib/pco';

// Vercel Cron invokes this on the schedule in vercel.json. Its purpose is
// twofold: keep member data fresh, and keep the PCO OAuth token alive —
// PCO revokes refresh tokens after ~90 days without use.
export const maxDuration = 60;

// Leave headroom inside maxDuration so the handler always returns a response
// and writes its sync_log row instead of being killed mid-geocode.
const GEOCODE_BUDGET_MS = 45_000;

/** Constant-time compare that tolerates differing lengths. */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error('CRON_SECRET is not set — refusing to run the scheduled sync.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const header = request.headers.get('authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = await getPcoSyncUserId();
    if (!userId) {
      const detail = PCO_ERROR_MESSAGES.not_connected;
      await logSync('cron', false, detail, null);
      return NextResponse.json({ success: false, reason: 'not_connected', detail });
    }

    const tokenResult = await getValidPcoToken(userId);
    if (tokenResult.error) {
      // A dead token can't be repaired by cron — an admin has to reconnect.
      // Report it as a 200 so the cron isn't retried or flagged as a crash.
      const detail = PCO_ERROR_MESSAGES[tokenResult.error];
      await logSync('cron', false, detail, null);
      return NextResponse.json({ success: false, reason: tokenResult.error, detail });
    }

    const result = await runPcoSync(tokenResult.token, {
      geocodeDeadline: Date.now() + GEOCODE_BUDGET_MS,
    });

    await logSync(
      'cron',
      true,
      `Imported ${result.imported}, archived ${result.archived}, ${result.campuses} campuses`,
      result.imported
    );

    return NextResponse.json({
      success: true,
      synced: result.imported,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Cron PCO sync error:', message, error);
    await logSync('cron', false, message, null);
    return NextResponse.json({ success: false, reason: 'sync_failed', detail: message }, { status: 500 });
  }
}
