import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isUuid } from '@/lib/system';
import { CHURCH_COOKIE, CHURCH_COOKIE_MAX_AGE, resolveChurchForUser } from '@/lib/currentChurch';

/**
 * Switch the current church (the header's church switcher).
 *
 *   POST { churchId } -> { churchId }
 *
 * Allowed only for a church the user belongs to, or any church for a
 * platform admin. The choice lives in a cookie that every request checks
 * again (resolveChurchForUser), so a stale or forged cookie is ignored.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { churchId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isUuid(body.churchId)) return NextResponse.json({ error: 'Invalid churchId' }, { status: 400 });

  const resolved = await resolveChurchForUser(userId, body.churchId);
  if (resolved?.churchId !== body.churchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const response = NextResponse.json({ churchId: resolved.churchId });
  response.cookies.set(CHURCH_COOKIE, resolved.churchId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.NEXTAUTH_URL ?? '').startsWith('https://'),
    path: '/',
    maxAge: CHURCH_COOKIE_MAX_AGE,
  });
  return response;
}
