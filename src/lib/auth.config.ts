import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const protectedPaths = [
        '/dashboard',
        '/discipleship',
        '/incubator',
        '/house-churches',
        '/members',
        '/attendance',
        '/prayer',
      ];
      const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

      if (isProtected) {
        return isLoggedIn;
      }
      return true;
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
