/**
 * Seed the 2027 leadership calendar and link each row to the event that
 * already exists in the CityChurch Miami Google Calendar.
 *
 *   npm run seed:calendar              # insert + link
 *   npm run seed:calendar -- --dry-run # report only, writes nothing
 *
 * - Idempotent: aborts if any calendar_events row already falls in 2027.
 * - Linking: a row links to a Google event with the same start date
 *   (start.date, or the date part of start.dateTime) and EXACTLY the same
 *   summary as title_en. Exactly one match → google_event_id + 'synced'.
 *   Anything else stays 'pending', and the next Sync in the UI creates it.
 * - Pushes nothing to Google. Reads Google; writes only to the database.
 * - All inserts run in one transaction.
 */
import { loadEnvConfig } from '@next/env';
import { readFileSync } from 'node:fs';
import path from 'node:path';

loadEnvConfig(process.cwd());

interface SeedRow {
  title_en: string;
  title_es: string | null;
  category: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: 'scheduled' | 'cancelled';
  notes: string | null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  // Imported after env is loaded.
  const { neon } = await import('@neondatabase/serverless');
  const { isCalendarCategory } = await import('../src/lib/calendarCategories');
  const { isISODate } = await import('../src/lib/calendarDates');
  const { getCalendarClient, getCalendarId, CALENDAR_TIME_ZONE } = await import('../src/lib/googleCalendarSync');

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const sql = neon(process.env.DATABASE_URL);

  const rows: SeedRow[] = JSON.parse(
    readFileSync(path.join(process.cwd(), 'db/seed/calendar_2027.json'), 'utf8')
  );
  for (const r of rows) {
    if (!r.title_en || !isCalendarCategory(r.category) || !isISODate(r.start_date) || !isISODate(r.end_date)) {
      throw new Error(`Invalid seed row: ${JSON.stringify(r)}`);
    }
  }

  // --- Idempotency guard -------------------------------------------------
  const existing = await sql`
    SELECT count(*)::int AS n FROM calendar_events
    WHERE start_date <= '2027-12-31' AND end_date >= '2027-01-01'`;
  if (existing[0].n > 0) {
    const msg = `calendar_events already has ${existing[0].n} row(s) in 2027 — refusing to seed again.`;
    if (!dryRun) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(`WARNING: ${msg} (continuing because this is a dry run)`);
  }

  const admins = await sql`SELECT id, name FROM users WHERE role = 'admin' ORDER BY created_at, id LIMIT 1`;
  if (admins.length === 0) throw new Error('No admin user found for created_by');
  const createdBy = admins[0].id as string;

  // --- Read every 2027 Google event --------------------------------------
  const calendar = getCalendarClient();
  const calendarId = getCalendarId();
  type G = { id: string; date: string; summary: string };
  const googleEvents: G[] = [];
  let pageToken: string | undefined;
  do {
    const res = await calendar.events.list({
      calendarId,
      timeMin: '2027-01-01T00:00:00-05:00',
      timeMax: '2028-01-01T00:00:00-05:00',
      timeZone: CALENDAR_TIME_ZONE,
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });
    for (const ev of res.data.items ?? []) {
      const date = ev.start?.date ?? ev.start?.dateTime?.slice(0, 10);
      if (!ev.id || !date) continue;
      googleEvents.push({ id: ev.id, date, summary: ev.summary ?? '' });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  // --- Match ---------------------------------------------------------------
  const usedGoogleIds = new Set<string>();
  const plan = rows.map((r) => {
    const matches = googleEvents.filter((g) => g.date === r.start_date && g.summary === r.title_en);
    const googleId = matches.length === 1 && !usedGoogleIds.has(matches[0].id) ? matches[0].id : null;
    if (googleId) usedGoogleIds.add(googleId);
    return { row: r, googleId, matchCount: matches.length };
  });
  const linked = plan.filter((p) => p.googleId);
  const pending = plan.filter((p) => !p.googleId);
  const unmatchedGoogle = googleEvents.filter((g) => !usedGoogleIds.has(g.id));

  // --- Write ---------------------------------------------------------------
  if (!dryRun) {
    await sql.transaction(
      plan.map(({ row: r, googleId }) => sql`
        INSERT INTO calendar_events
          (title_en, title_es, category, start_date, end_date, start_time, end_time,
           notes, status, google_event_id, sync_status, created_by)
        VALUES
          (${r.title_en}, ${r.title_es}, ${r.category}, ${r.start_date}, ${r.end_date},
           ${r.start_time}, ${r.end_time}, ${r.notes}, ${r.status}, ${googleId},
           ${googleId ? 'synced' : 'pending'}, ${createdBy})`)
    );
  }

  // --- Report --------------------------------------------------------------
  console.log(dryRun ? '\n=== DRY RUN — nothing was written ===' : '\n=== Seed complete ===');
  console.log(`Seed rows:              ${rows.length}`);
  console.log(`Google events in 2027:  ${googleEvents.length}`);
  console.log(`Rows ${dryRun ? 'that would be ' : ''}inserted:   ${rows.length}`);
  console.log(`Rows ${dryRun ? 'that would be ' : ''}linked:     ${linked.length}`);
  console.log(`created_by:             ${admins[0].name}`);
  console.log(`\nPending (not linked) — ${pending.length}:`);
  for (const p of pending) {
    const why = p.matchCount === 0 ? 'no match' : `${p.matchCount} matches (ambiguous)`;
    console.log(`  ${p.row.start_date}  ${p.row.title_en}  [${p.row.status}] — ${why}`);
  }
  console.log(`\nGoogle events not matched to any row — ${unmatchedGoogle.length}:`);
  for (const g of unmatchedGoogle) console.log(`  ${g.date}  ${g.summary}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
