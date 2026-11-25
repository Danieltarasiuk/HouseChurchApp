/**
 * One-off backfill: give every existing user without a members row one,
 * exactly as a first sign-in or registration now does (src/lib/memberLink.ts):
 * link the unlinked member with the same email, or create one. A user whose
 * email belongs to a member already linked to someone else is reported and
 * left alone.
 *
 *   npm run backfill:member-links                          # dry run: report only
 *   npm run backfill:member-links -- --apply --host=<host> # write
 *
 * DO NOT run with --apply against production without reviewing the dry run
 * first. --apply refuses to run unless --host names the exact host in
 * DATABASE_URL, so the target is always a deliberate choice.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  const apply = process.argv.includes('--apply');
  const hostArg = process.argv.find((a) => a.startsWith('--host='))?.slice('--host='.length);

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const host = new URL(url).host;
  console.log(`database host: ${host}`);
  console.log(apply ? 'mode: APPLY (writes)' : 'mode: dry run (writes nothing)');

  if (apply && hostArg !== host) {
    console.error(`\nRefusing to write: pass --host=${host} to confirm this is the database you mean.`);
    process.exit(1);
  }

  // Imported after env is loaded (db.ts reads DATABASE_URL at import).
  const { sql } = await import('../src/lib/db');
  const { linkOrCreateMember } = await import('../src/lib/memberLink');

  const users = await sql(
    `SELECT u.id, u.email, u.name,
            (SELECT m.id FROM members m WHERE LOWER(m.email) = LOWER(u.email) AND m.user_id IS NULL
             ORDER BY m.joined_at NULLS LAST LIMIT 1) AS linkable_member,
            EXISTS (SELECT 1 FROM members m WHERE LOWER(m.email) = LOWER(u.email)) AS email_in_members
     FROM users u
     WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.user_id = u.id)
     ORDER BY u.created_at`
  );

  if (users.length === 0) {
    console.log('\nEvery user already has a members row. Nothing to do.');
    return;
  }

  const counts: Record<string, number> = {};
  console.log(`\n${users.length} user(s) without a members row:`);
  for (const u of users) {
    const expected = u.linkable_member ? 'linked' : u.email_in_members ? 'email_taken' : 'created';
    const outcome = apply ? await linkOrCreateMember(u.id, u.email, u.name) : expected;
    counts[outcome] = (counts[outcome] ?? 0) + 1;
    const verb = apply ? outcome : `would be ${expected}`;
    console.log(`  ${u.email.replace(/(^.).*(@.*$)/, '$1…$2')}: ${verb}`);
  }
  console.log('\nsummary:', counts);
  if (!apply) console.log('\nDry run only. Re-run with --apply --host=<host> to write.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
