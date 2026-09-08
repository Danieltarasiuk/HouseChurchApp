import type { NextAuthConfig } from 'next-auth';
import { isProtectedPath } from '@/lib/protected-paths';

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
      if (!isProtectedPath(request.nextUrl.pathname)) return true;
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [], // populated in auth.ts
};
