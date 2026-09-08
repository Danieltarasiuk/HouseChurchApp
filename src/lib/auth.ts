import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcryptjs from 'bcryptjs';
import { sql } from '@/lib/db';
import { authConfig } from '@/lib/auth.config';
import { isProtectedPath } from '@/lib/protected-paths';

/**
 * How long a role cached in the JWT is trusted before it is re-read from the
 * users table. The jwt callback runs on every auth() call — several per page
 * load — so reading per request would add a database round trip to nearly
 * every response for a value that changes rarely. Five minutes bounds how long
 * a promotion or demotion can lag; previously a stale role persisted until the
 * user signed out, so this only narrows the window.
 */
const ROLE_TTL_MS = 5 * 60 * 1000;

/** Split a display name into first/last, falling back to the email local part. */
function splitName(name: string | null | undefined, email: string): { first: string; last: string } {
  const clean = (name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { first: email.split('@')[0], last: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/**
 * Give a newly created user a members row so they show up in Members,
 * Attendance and Pastoral Care. Prefers linking an existing (typically
 * PCO-imported) member with the same email over creating a duplicate.
 *
 * Never throws: a failure here must not block sign-in, since the users
 * row is already committed and auth does not depend on members.
 */
async function linkOrCreateMember(userId: string, email: string, name: string | null | undefined): Promise<void> {
  try {
    const linked = await sql(
      `UPDATE members SET user_id = $1
       WHERE id = (
         SELECT id FROM members
         WHERE LOWER(email) = $2 AND user_id IS NULL
         ORDER BY joined_at NULLS LAST
         LIMIT 1
       )
       RETURNING id`,
      [userId, email]
    );
    if (linked.length > 0) return;

    // An email match that is already linked to someone else: leave it alone
    // rather than creating a confusing duplicate.
    const taken = await sql('SELECT id FROM members WHERE LOWER(email) = $1 LIMIT 1', [email]);
    if (taken.length > 0) return;

    const { first, last } = splitName(name, email);
    await sql(
      `INSERT INTO members (user_id, first_name, last_name, email, house_church_id, is_active)
       VALUES ($1, $2, $3, $4, NULL, true)`,
      [userId, first, last, email]
    );
  } catch (error) {
    console.error('Member link/create failed for user', userId, error);
  }
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
          const existing = await sql(
            'SELECT id, role, password_hash FROM users WHERE email = $1',
            [email]
          );

          if (existing.length === 0) {
            // Auto-create user on first Google sign-in (NULL password_hash).
            // name is NOT NULL, so fall back to the email local part.
            const result = await sql(
              "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, NULL, 'member') RETURNING id, role",
              [email, user.name?.trim() || email.split('@')[0]]
            );
            user.id = result[0].id;
            (user as { role?: string }).role = result[0].role;

            await linkOrCreateMember(result[0].id, email, user.name);
          } else {
            // Allow Google sign-in for existing accounts (links Google to existing account)
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
    async jwt({ token, user, trigger }) {
      // Sign-in: seed the token from the freshly authenticated user.
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.roleCheckedAt = Date.now();
        return token;
      }

      // Nothing to re-check against (shouldn't happen for a valid session).
      if (!token.id) return token;

      const checkedAt = typeof token.roleCheckedAt === 'number' ? token.roleCheckedAt : 0;
      const isStale = Date.now() - checkedAt > ROLE_TTL_MS;

      // `update` lets a client force a refresh via useSession().update().
      if (!isStale && trigger !== 'update') return token;

      try {
        const rows = await sql('SELECT role FROM users WHERE id = $1', [token.id]);

        if (rows.length === 0) {
          // The account no longer exists — end the session rather than keep
          // honouring a cached role for a deleted user.
          return null;
        }

        token.role = rows[0].role;
        token.roleCheckedAt = Date.now();
      } catch (error) {
        // A transient database problem must not sign everyone out. Keep the
        // cached role and leave roleCheckedAt untouched so the next request
        // retries immediately.
        console.error('Role refresh failed for user', token.id, error);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
