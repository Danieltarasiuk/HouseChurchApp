import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcryptjs from 'bcryptjs';
import { authConfig } from '@/lib/auth.config';
import { isProtectedPath } from '@/lib/protected-paths';
import { googleSignIn } from '@/lib/memberLink';
import { systemFindLoginUser, systemListMemberships, systemUserAccess } from '@/lib/system';
import { pickChurch, readChurchCookie } from '@/lib/currentChurch';

/**
 * How long the memberships cached in the JWT are trusted before they are
 * re-read. They only shape the UI (which church, which role to show); every
 * API route re-reads the role from the database (authz.ts). The jwt callback
 * runs on every auth() call, so reading per request would add a database
 * round trip to nearly every response for a value that changes rarely.
 */
const MEMBERSHIPS_TTL_MS = 5 * 60 * 1000;

/** Compact membership in the token: church, role, status. */
type TokenMembership = { c: string; r: 'admin' | 'group_leader' | 'member'; s: 'active' | 'pending' };

async function loadAccess(userId: string) {
  const access = await systemUserAccess(userId);
  if (!access) return null;
  const memberships = await systemListMemberships(userId);
  return {
    isPlatformAdmin: access.isPlatformAdmin,
    memberships: memberships.map((m): TokenMembership => ({ c: m.churchId, r: m.role, s: m.status })),
  };
}

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

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = await systemFindLoginUser(email);
        // Google-only users have no password — reject credential login
        if (!user || !user.password_hash) return null;

        const passwordMatch = await bcryptjs.compare(password, user.password_hash);
        if (!passwordMatch) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // Middleware builds its NextAuth instance from authConfig, so in practice
    // that copy of this callback is the one that runs. Kept here, reading the
    // same shared list, so the two instances can never disagree.
    async authorized({ auth: session, request }) {
      if (!isProtectedPath(request.nextUrl.pathname)) return true;
      return !!session?.user;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        if (!user.email) return false;

        // Match the normalization the registration and credentials paths use,
        // so a mixed-case Google address finds its existing row instead of
        // colliding with the UNIQUE constraint on insert.
        const email = user.email.toLowerCase().trim();

        try {
          const signedIn = await googleSignIn(email, user.name);
          user.id = signedIn.id;
        } catch (error) {
          console.error('Google sign-in error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Sign-in: seed the token from the freshly authenticated user.
      if (user) token.id = user.id;

      // Nothing to re-check against (shouldn't happen for a valid session).
      if (!token.id) return token;

      const checkedAt = typeof token.accessCheckedAt === 'number' ? token.accessCheckedAt : 0;
      const isStale = user || !Array.isArray(token.memberships) || Date.now() - checkedAt > MEMBERSHIPS_TTL_MS;
      // `update` lets a client force a refresh via useSession().update().
      if (!isStale && trigger !== 'update') return token;

      try {
        const access = await loadAccess(token.id as string);
        // The account no longer exists — end the session rather than keep
        // honouring cached memberships for a deleted user.
        if (!access) return null;
        token.isPlatformAdmin = access.isPlatformAdmin;
        token.memberships = access.memberships;
        // For the middleware: an account with nothing but pending memberships
        // only sees the waiting screen.
        token.status = access.isPlatformAdmin || access.memberships.some((m) => m.s === 'active') ? 'active' : 'pending';
        token.accessCheckedAt = Date.now();
      } catch (error) {
        // A transient database problem must not sign everyone out. Keep the
        // cached values and leave accessCheckedAt untouched so the next
        // request retries immediately.
        console.error('Membership refresh failed for user', token.id, error);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Role and status in the church this request is in, for the UI.
        const memberships = (Array.isArray(token.memberships) ? token.memberships : []) as TokenMembership[];
        const isPlatformAdmin = token.isPlatformAdmin === true;
        const requested = await readChurchCookie();
        const picked = pickChurch({
          memberships: memberships.map((m) => ({ churchId: m.c, role: m.r, status: m.s })),
          isPlatformAdmin,
          // A platform admin may open a church they do not belong to; the
          // server checks that it exists when the request runs there.
          churchIds: isPlatformAdmin && requested ? [requested] : [],
          requested,
        });
        const u = session.user as { id?: string; role?: string; status?: string; churchId?: string | null; isPlatformAdmin?: boolean };
        u.id = token.id as string;
        u.role = picked?.status === 'active' ? picked.role : 'member';
        u.status = picked ? picked.status : (token.status as string) ?? 'pending';
        u.churchId = picked?.churchId ?? null;
        u.isPlatformAdmin = isPlatformAdmin;
      }
      return session;
    },
  },
});
