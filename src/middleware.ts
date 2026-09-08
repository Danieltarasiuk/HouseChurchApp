import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export default NextAuth(authConfig).auth;

/**
 * Runs middleware on every page request except static assets and API routes,
 * and lets the `authorized` callback decide what is protected using
 * PROTECTED_PATHS in src/lib/protected-paths.ts.
 *
 * Next.js requires this matcher to be a static literal — it is read by
 * build-time static analysis, not evaluated. Building it from the shared
 * array makes Next.js log "can't recognize the exported `config` field",
 * still report a successful build, and silently fall back to matching every
 * route. So the list cannot be imported here; the catch-all keeps
 * PROTECTED_PATHS the only place a route is actually declared protected,
 * rather than a second list that can drift out of sync.
 *
 * API routes are excluded because each one authenticates itself with auth()
 * and checks its own role requirements.
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
