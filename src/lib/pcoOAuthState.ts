import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';

/**
 * CSRF protection for the Planning Center OAuth connect flow: the authorize
 * route sends a random `state` and keeps it in a short-lived httpOnly cookie;
 * the callback accepts a code only when the returned `state` matches it.
 */
export const PCO_STATE_COOKIE = 'pco_oauth_state';
export const PCO_STATE_MAX_AGE_SECONDS = 600;

export function newPcoState(): string {
  return randomBytes(32).toString('base64url');
}

/** Cookie options. Lax so the cookie rides PCO's top-level redirect back. */
export function pcoStateCookieOptions(baseUrl: string) {
  return {
    httpOnly: true,
    secure: baseUrl.startsWith('https://'),
    sameSite: 'lax' as const,
    path: '/api/planning-center/callback',
    maxAge: PCO_STATE_MAX_AGE_SECONDS,
  };
}

/** Constant-time compare; false when either side is missing. */
export function pcoStateMatches(returned: string | null | undefined, stored: string | null | undefined): boolean {
  if (!returned || !stored) return false;
  const a = createHash('sha256').update(returned).digest();
  const b = createHash('sha256').update(stored).digest();
  return timingSafeEqual(a, b);
}
