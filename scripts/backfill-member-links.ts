/**
 * One-off backfill: give existing users without a members row one.
 *
 * Only accounts created by Google sign-in (no password: Google verified the
 * email) are linked by email, exactly as a first Google sign-in does
 * (src/lib/memberLink.ts): link the unlinked member with the same email, or
 * create one. Accounts with a password signed up by email, which proves
 * nothing about owning the address, so they are listed as "needs admin
 * approval" and never linked here; approve them in Settings.
 *
 *   npm run backfill:member-links                          # dry run: report only
 *   npm run backfill:member-links -- --apply --host=<host> # write
 *   ... --church=<slug>                                    # a church other than CityChurch
 *
 * Runs inside that church (members are per church; row-level security).
 *
 * Review the dry run first. --apply refuses to run unless --host names the
 * exact host in DATABASE_URL, so the target is always a deliberate choice.
 */
import { loadEnvConfig } from '@next/env';
import { checkConnectionString } from '../src/lib/connectionString';

loadEnvConfig(process.cwd());

type Plan = 'link' | 'create' | 'skip_email_taken' | 'needs_admin_approval';

async function main() {
  const apply = process.argv.includes('--apply');
  const slug = process.argv.find((a) => a.startsWith('--church='))?.slice('--church='.length) ?? 'citychurch';
  const hostArg = process.argv.find((a) => a.startsWith('--host='))?.slice('--host='.length);

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const host = checkConnectionString(url).host;
  console.log(`database host: ${host}`);
  console.log(apply ? 'mode: APPLY (writes)' : 'mode: dry run (writes nothing)');

  if (apply && hostArg !== host) {
    console.error(`\nRefusing to write: pass --host=${host} to confirm this is the database you mean.`);
    process.exit(1);
  }

  // Imported after env is loaded (db.ts reads DATABASE_URL at import).
  const { sql, withChurch } = await import('../src/lib/db');
  const { systemListChurches } = await import('../src/lib/system');
  const { linkOrCreateMember } = await import('../src/lib/memberLink');

  const church = (await systemListChurches()).find((c) => c.slug === slug);
  if (!church) throw new Error(`No church with slug "${slug}"`);
  console.log(`church: ${church.name}`);
  await withChurch(church.id, () => backfill(sql, linkOrCreateMember, church.id, apply));
}

async function backfill(
  sql: typeof import('../src/lib/db').sql,
  linkOrCreateMember: typeof import('../src/lib/memberLink').linkOrCreateMember,
  churchId: string,
  apply: boolean
) {
  const users = await sql(
    `SELECT u.id, u.email, u.name, cm.status, u.created_at,
            (u.password_hash IS NULL) AS google_only,
            (SELECT m.id FROM members m WHERE LOWER(m.email) = LOWER(u.email) AND m.user_id IS NULL
             ORDER BY m.joined_at NULLS LAST LIMIT 1) AS linkable_member,
            (SELECT m.first_name || ' ' || m.last_name FROM members m
             WHERE LOWER(m.email) = LOWER(u.email) AND m.user_id IS NULL
             ORDER BY m.joined_at NULLS LAST LIMIT 1) AS linkable_member_name,
            EXISTS (SELECT 1 FROM members m WHERE LOWER(m.email) = LOWER(u.email)) AS email_in_members
     FROM users u
     JOIN church_memberships cm ON cm.user_id = u.id AND cm.church_id = $1
     WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.user_id = u.id)
     ORDER BY u.created_at`,
    [churchId]
  );

  if (users.length === 0) {
    console.log('\nEvery user already has a members row. Nothing to do.');
    return;
  }

  const plan = (u: Record<string, unknown>): Plan =>
    !u.google_only ? 'needs_admin_approval'
      : u.linkable_member ? 'link'
      : u.email_in_members ? 'skip_email_taken'
      : 'create';

  const why: Record<Plan, string> = {
    link: 'Google account; unlinked member with the same email',
    create: 'Google account; no member has this email',
    skip_email_taken: "Google account; this email's member is already linked to another account",
    needs_admin_approval: 'signed up with email and password; email not verified, approve in Settings',
  };

  const counts: Record<string, number> = {};
  console.log(`\n${users.length} user(s) without a members row:\n`);
  for (const u of users) {
    const p = plan(u);
    let outcome: string = p;
    if (apply && (p === 'link' || p === 'create')) {
      outcome = await linkOrCreateMember(u.id, u.email, u.name);
    }
    counts[outcome] = (counts[outcome] ?? 0) + 1;
    const created = new Date(u.created_at).toISOString().slice(0, 16).replace('T', ' ');
    const target = p === 'link' ? ` -> member ${u.linkable_member} (${u.linkable_member_name})` : '';
    console.log(`  ${u.email}  [created ${created} UTC, status ${u.status}]`);
    console.log(`    ${apply ? outcome : `would: ${p}`}${target}  (${why[p]})`);
  }
  console.log('\nsummary:', counts);
  if (!apply) console.log('\nDry run only. Re-run with --apply --host=<host> to write. Email sign-ups are never linked here.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
