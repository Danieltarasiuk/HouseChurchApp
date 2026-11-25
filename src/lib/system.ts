import { systemSql, CHURCH_COLUMNS, type ChurchSettings } from '@/lib/db';

/**
 * System functions: the only queries that run with no church set. They work
 * before a church is known (sign-in, choosing a church, the cron finding
 * churches to sync), so row-level security cannot scope them. Each one
 * touches only users, churches and church_memberships, which have no
 * church-owned data in them, and nothing else. Keep this list short; lint
 * keeps systemSql out of every other file.
 */

export interface Membership {
  churchId: string;
  slug: string;
  name: string;
  role: 'admin' | 'group_leader' | 'member';
  status: 'active' | 'pending';
}

export interface ChurchSummary {
  id: string;
  slug: string;
  name: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/** Credentials sign-in: the account for an email, with its password hash. */
export async function systemFindLoginUser(email: string) {
  const rows = await systemSql('SELECT id, email, name, password_hash FROM users WHERE email = $1', [email]);
  return rows[0] as { id: string; email: string; name: string; password_hash: string | null } | undefined;
}

/** Whether the account still exists, and whether it is a platform admin. */
export async function systemUserAccess(userId: string): Promise<{ isPlatformAdmin: boolean } | null> {
  const rows = await systemSql('SELECT is_platform_admin FROM users WHERE id = $1', [userId]);
  return rows[0] ? { isPlatformAdmin: rows[0].is_platform_admin === true } : null;
}

/** Every church the user belongs to, oldest membership first. */
export async function systemListMemberships(userId: string): Promise<Membership[]> {
  const rows = await systemSql(
    `SELECT m.church_id, c.slug, c.name, m.role, m.status
     FROM church_memberships m JOIN churches c ON c.id = m.church_id
     WHERE m.user_id = $1
     ORDER BY m.created_at, c.created_at`,
    [userId]
  );
  return rows.map((r) => ({ churchId: String(r.church_id), slug: r.slug, name: r.name, role: r.role, status: r.status }));
}

/** All churches, oldest first (platform admins' switcher; the cron). */
export async function systemListChurches(): Promise<ChurchSummary[]> {
  const rows = await systemSql('SELECT id, slug, name FROM churches ORDER BY created_at, slug');
  return rows.map((r) => ({ id: String(r.id), slug: r.slug, name: r.name }));
}

/** A church's settings by id, or null (the root layout, before any query in it). */
export async function systemGetChurch(id: string): Promise<ChurchSettings | null> {
  if (!isUuid(id)) return null;
  const rows = await systemSql(`SELECT ${CHURCH_COLUMNS} FROM churches WHERE id = $1`, [id]);
  return (rows[0] as ChurchSettings) ?? null;
}

/**
 * Email/password registration: a new account with a PENDING membership in
 * the church the visitor is signing up to, in one statement (both or
 * neither). Null when the email is already registered.
 */
export async function systemCreatePendingAccount(
  name: string, email: string, passwordHash: string, churchId: string
): Promise<string | null> {
  const rows = await systemSql(
    `WITH u AS (
       INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING RETURNING id
     )
     INSERT INTO church_memberships (user_id, church_id, role, status)
     SELECT id, $4, 'member', 'pending' FROM u
     RETURNING user_id`,
    [name, email, passwordHash, churchId]
  );
  return rows[0] ? String(rows[0].user_id) : null;
}

/**
 * Google sign-in: the account for this (Google-verified) email, created if
 * new, and an ACTIVE membership in the church being signed in to if the
 * account has none there yet. An existing membership is left as it is (a
 * pending one stays pending).
 */
export async function systemGoogleAccount(
  email: string, name: string, churchId: string
): Promise<{ userId: string; userCreated: boolean; membershipCreated: boolean }> {
  const users = await systemSql(
    `WITH existing AS (SELECT id FROM users WHERE email = $1),
     created AS (
       INSERT INTO users (email, name, password_hash)
       SELECT $1, $2, NULL WHERE NOT EXISTS (SELECT 1 FROM existing)
       ON CONFLICT (email) DO NOTHING
       RETURNING id
     )
     SELECT id, false AS created FROM existing
     UNION ALL SELECT id, true AS created FROM created`,
    [email, name]
  );
  // Lost a race with a simultaneous first sign-in: the other one created it.
  const user = users[0] ?? (await systemSql('SELECT id, false AS created FROM users WHERE email = $1', [email]))[0];
  const joined = await systemSql(
    `INSERT INTO church_memberships (user_id, church_id, role, status)
     VALUES ($1, $2, 'member', 'active')
     ON CONFLICT (user_id, church_id) DO NOTHING
     RETURNING id`,
    [user.id, churchId]
  );
  return { userId: String(user.id), userCreated: user.created === true, membershipCreated: joined.length > 0 };
}
