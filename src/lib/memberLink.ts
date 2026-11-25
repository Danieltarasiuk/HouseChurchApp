import { sql } from './db';

/**
 * Gives a user a members row so they show up in Members, Attendance and
 * Pastoral Care. Shared by every path that creates a user (first Google
 * sign-in, email registration) and by the one-off backfill script, so they
 * can never disagree.
 *
 * Prefers linking an existing, unlinked member with the same email
 * (typically PCO-imported) over creating a duplicate. If that email's member
 * is already linked to someone else, does nothing rather than create a
 * confusing duplicate.
 */

/** Split a display name into first/last, falling back to the email local part. */
export function splitName(name: string | null | undefined, email: string): { first: string; last: string } {
  const clean = (name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { first: email.split('@')[0], last: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export type LinkOutcome = 'linked' | 'created' | 'email_taken' | 'failed';

/**
 * The database side of a Google sign-in. A first sign-in creates an active
 * user and links (or creates) their member by email, which is safe because
 * Google has verified the address. Email/password registration must never do
 * this: it creates a pending account that an admin approves and links.
 * An existing account signs in as it is (a pending one stays pending).
 */
export async function googleSignIn(
  email: string,
  name: string | null | undefined
): Promise<{ id: string; role: string; status: string }> {
  const normalized = email.toLowerCase().trim();
  const existing = await sql('SELECT id, role, status FROM users WHERE email = $1', [normalized]);
  if (existing.length > 0) {
    return { id: existing[0].id, role: existing[0].role, status: existing[0].status };
  }
  // name is NOT NULL, so fall back to the email local part.
  const created = await sql(
    "INSERT INTO users (email, name, password_hash, role, status) VALUES ($1, $2, NULL, 'member', 'active') RETURNING id, role, status",
    [normalized, name?.trim() || normalized.split('@')[0]]
  );
  await linkOrCreateMember(created[0].id, normalized, name);
  return { id: created[0].id, role: created[0].role, status: created[0].status };
}

/**
 * Never throws: a failure here must not block sign-in or registration, since
 * the users row is already committed and auth does not depend on members.
 */
export async function linkOrCreateMember(
  userId: string,
  email: string,
  name: string | null | undefined
): Promise<LinkOutcome> {
  const normalized = email.toLowerCase().trim();
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
      [userId, normalized]
    );
    if (linked.length > 0) return 'linked';

    const taken = await sql('SELECT id FROM members WHERE LOWER(email) = $1 LIMIT 1', [normalized]);
    if (taken.length > 0) return 'email_taken';

    const { first, last } = splitName(name, normalized);
    await sql(
      `INSERT INTO members (user_id, first_name, last_name, email, group_id, is_active)
       VALUES ($1, $2, $3, $4, NULL, true)`,
      [userId, first, last, normalized]
    );
    return 'created';
  } catch (error) {
    console.error('Member link/create failed for user', userId, error);
    return 'failed';
  }
}
