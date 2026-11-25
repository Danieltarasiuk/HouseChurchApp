import type { NextAuthConfig } from 'next-auth';
import { isProtectedPath, PENDING_PATH } from '@/lib/protected-paths';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    // Send auth failures back to our own login page as ?error=<code>
    // instead of NextAuth's bare built-in "Access Denied" page.
    error: '/login',
  },
  callbacks: {
    async authorized({ auth, request }) {
      // The matcher in middleware.ts is a catch-all, so this callback is the
      // one place that decides what requires a session.
      const path = request.nextUrl.pathname;
      if (!isProtectedPath(path)) return true;
      if (!auth?.user) return false;
      // An account waiting for admin approval sees only the waiting screen.
      // (API routes enforce this separately, from the database.)
      const pending = (auth.user as { status?: string }).status === 'pending';
      if (pending && path !== PENDING_PATH) return Response.redirect(new URL(PENDING_PATH, request.nextUrl));
      return true;
    },
    // The middleware only reads the token the full instance (auth.ts) wrote:
    // token.status is 'pending' when the account has no active membership in
    // any church (and is not a platform admin).
    async session({ session, token }) {
      if (session.user) {
        (session.user as { status?: string }).status = (token.status as string) ?? 'pending';
      }
      return session;
    },
  },
  providers: [], // populated in auth.ts
};
