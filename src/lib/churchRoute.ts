import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withChurch } from '@/lib/db';
import { resolveChurchForUser } from '@/lib/currentChurch';

/**
 * Wraps an API route handler so it runs inside the signed-in user's current
 * church: one transaction with app.church_id set (row-level security), and
 * the user available to requireViewer(). Signed out: 401. A user who belongs
 * to no church: 403 no_church.
 *
 *   export const GET = inChurch(async (request) => { ... });
 */
export function inChurch<A extends unknown[], R extends Response>(handler: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R | NextResponse> => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const church = await resolveChurchForUser(userId);
    if (!church) return NextResponse.json({ error: 'No church', reason: 'no_church' }, { status: 403 });

    return withChurch(church.churchId, () => handler(...args), { userId });
  };
}
