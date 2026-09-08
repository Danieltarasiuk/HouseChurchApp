import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getValidPcoToken, runPcoSync, logSync, PCO_ERROR_MESSAGES } from '@/lib/pco';

// Geocoding is rate limited to 1 req/sec, so cap the whole request well
// inside the platform's function timeout and let leftovers roll to the next run.
export const maxDuration = 60;
const GEOCODE_BUDGET_MS = 40_000;

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const tokenResult = await getValidPcoToken(session.user.id!);
    if (tokenResult.error) {
      const message = PCO_ERROR_MESSAGES[tokenResult.error];
      await logSync('manual', false, message, null);
      const status = tokenResult.error === 'pco_unavailable' ? 502 : 400;
      return NextResponse.json({ error: message, reason: tokenResult.error }, { status });
    }

    const result = await runPcoSync(tokenResult.token, {
      geocodeDeadline: Date.now() + GEOCODE_BUDGET_MS,
    });

    await logSync(
      'manual',
      true,
      `Imported ${result.imported}, archived ${result.archived}, ${result.campuses} campuses`,
      result.imported
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('PCO import error:', message, error);
    await logSync('manual', false, message, null);
    return NextResponse.json({ error: `Sync failed: ${message}` }, { status: 500 });
  }
}
