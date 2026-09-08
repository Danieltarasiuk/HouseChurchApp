/**
 * The single source of truth for which routes require a signed-in user.
 *
 * This module MUST stay dependency-free. It is imported by auth.config.ts,
 * which runs in the Edge runtime inside middleware and therefore cannot pull
 * in the database client or anything else Node-only.
 *
 * Two consumers read this list:
 *   - the `authorized` callback in auth.config.ts, which decides whether to
 *     redirect an anonymous request to /login
 *   - src/middleware.ts, whose `config.matcher` decides which requests the
 *     middleware runs on at all
 *
 * Next.js requires `config.matcher` to be a static literal it can analyse at
 * build time, so the matcher cannot be computed from this array. Instead
 * middleware.ts declares a catch-all matcher and lets the `authorized`
 * callback make every path decision from this list — which keeps the list
 * authoritative rather than duplicated.
 */
export const PROTECTED_PATHS = [
  '/dashboard',
  '/discipleship',
  '/incubator',
  '/house-churches',
  '/members',
  '/attendance',
  '/prayer',
  '/pastoral',
  '/settings',
] as const;

/**
 * True when `pathname` is a protected route or one of its sub-routes.
 *
 * Matches the segment boundary rather than a bare prefix, so `/members`
 * and `/members/abc` are protected while a hypothetical `/members-public`
 * would not be. This mirrors how the Next.js pattern `/members/:path*`
 * behaves, keeping the two layers in agreement.
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
