import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcryptjs from 'bcryptjs';
import { sql } from '@/lib/db';
import { authConfig } from '@/lib/auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const rows = await sql(
          'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
          [email]
        );

        if (rows.length === 0) {
          return null;
        }

        const user = rows[0];

        // Google-only users have no password — reject credential login
        if (!user.password_hash) {
          return null;
        }

        const passwordMatch = await bcryptjs.compare(password, user.password_hash);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const { pathname } = request.nextUrl;
      const protectedPaths = ['/dashboard', '/discipleship', '/incubator', '/house-churches', '/members', '/attendance', '/prayer'];
      const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
      if (isProtected) return isLoggedIn;
      return true;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) return false;

        try {
          const existing = await sql(
            'SELECT id, role, password_hash FROM users WHERE email = $1',
            [user.email]
          );

          if (existing.length === 0) {
            // Auto-create user on first Google sign-in (NULL password_hash)
            const result = await sql(
              "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, NULL, 'member') RETURNING id, role",
              [user.email, user.name]
            );
            user.id = result[0].id;
            (user as { role?: string }).role = result[0].role;
          } else {
            // Only allow linking if the existing account has no password (i.e. was created via Google)
            if (existing[0].password_hash) {
              // Existing credential-based account — block Google sign-in to prevent takeover
              return false;
            }
            user.id = existing[0].id;
            (user as { role?: string }).role = existing[0].role;
          }
        } catch (error) {
          console.error('Google sign-in error:', error);
          return false;
        }
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
});
