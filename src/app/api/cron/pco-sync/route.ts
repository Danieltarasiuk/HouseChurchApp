import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { withChurch } from '@/lib/db';
import { systemListChurches } from '@/lib/system';
import {
  getPcoSyncUserId,
  getValidPcoToken,
  runPcoSync,
  logSync,
  encodeSyncDetail,
  encodeFailureDetail,
  PCO_ERROR_MESSAGES,
} from '@/lib/pco';

// Vercel Cron invokes this on the schedule in vercel.json. Its purpose is
// twofold: keep member data fresh, and keep the PCO OAuth token alive —
// PCO revokes refresh tokens after ~90 days without use.
//
// It syncs every church that has connected Planning Center, one after the
// other, each inside its own church context (row-level security). A church
// that has never connected is skipped; one church failing never stops the
// next. (PR 1.3: per-church connections; fan out when there are many.)
export const maxDuration = 60;

// Leave headroom inside maxDuration so the handler always returns a response
// and writes its sync_log rows instead of being killed mid-geocode. The
// budget is shared: churches synced later get whatever geocoding time is left.
const GEOCODE_BUDGET_MS = 45_000;

type ChurchSyncOutcome =
  | { status: 'skipped'; reason: 'not_connected' }
  | { status: 'failed'; reason: string; detail?: string }
  | ({ status: 'ok' | 'warnings' | 'failed_people' } & Record<string, unknown>);

/** One church's sync, inside its church context. Never throws. */
async function syncCurrentChurch(geocodeDeadline: number): Promise<ChurchSyncOutcome> {
  try {
    const userId = await getPcoSyncUserId();
    // Never connected: nothing to keep alive, and not an error for this church.
    if (!userId) return { status: 'skipped', reason: 'not_connected' };

    const tokenResult = await getValidPcoToken(userId);
    if (tokenResult.error) {
      // A dead token can't be repaired by cron — an admin has to reconnect.
      await logSync('cron', false, encodeFailureDetail({ step: 'connection', code: tokenResult.error }), null);
      return { status: 'failed', reason: tokenResult.error, detail: PCO_ERROR_MESSAGES[tokenResult.error] };
    }

    const result = await runPcoSync(tokenResult.token, { geocodeDeadline });
    // A failed people step is a failed run; other step failures are warnings
    // on a successful one. Either way the per-step reasons go in the detail.
    await logSync('cron', result.status !== 'failed', encodeSyncDetail(result), result.imported);
    return { ...result, status: result.status === 'failed' ? 'failed_people' : result.status, synced: result.imported };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Cron PCO sync error:', message, error);
    await logSync('cron', false, encodeFailureDetail({ step: 'sync', code: 'unexpected', params: { detail: message } }), null);
    return { status: 'failed', reason: 'sync_failed', detail: message };
  }
}

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

  const geocodeDeadline = Date.now() + GEOCODE_BUDGET_MS;
  const churches = await systemListChurches();
  const results: ({ church: string } & ChurchSyncOutcome)[] = [];
  for (const church of churches) {
    let outcome: ChurchSyncOutcome;
    try {
      outcome = await withChurch(church.id, () => syncCurrentChurch(geocodeDeadline));
    } catch (error) {
      // Opening the church's context failed (database unreachable): record
      // it and carry on with the next church.
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Cron PCO sync: could not open church ${church.slug}:`, message);
      outcome = { status: 'failed', reason: 'sync_failed', detail: message };
    }
    results.push({ church: church.slug, ...outcome });
  }

  // 200 even when a church failed: retrying immediately would not help, and
  // each failure is recorded in that church's sync_log for its settings page.
  return NextResponse.json({
    success: results.every((r) => r.status === 'ok' || r.status === 'warnings' || r.status === 'skipped'),
    timestamp: new Date().toISOString(),
    churches: results,
  });
}
