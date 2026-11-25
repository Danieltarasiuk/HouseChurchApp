/**
 * Seeds a second church, "Test Church", with its own people and data, for
 * checking multi-church isolation by hand (switch to it as a platform admin).
 * For DEVELOPMENT databases only.
 *
 *   npx tsx scripts/seed-test-church.ts --host=<the host in DATABASE_URL>
 *
 * Refuses unless --host names the exact host in DATABASE_URL (so the target
 * is always a deliberate choice) and refuses if test-church already exists.
 * Everything runs in one transaction with app.church_id set to the new
 * church, so it works with the app's role under row-level security. The
 * people it creates have no password: nobody can sign in as them.
 */
import { loadEnvConfig } from '@next/env';
import { randomUUID } from 'node:crypto';

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const host = new URL(url).host;
  const hostArg = process.argv.find((a) => a.startsWith('--host='))?.slice('--host='.length);
  console.log(`database host: ${host}`);
  if (hostArg !== host) {
    console.error(`Refusing to write: pass --host=${host} to confirm this is the (development) database you mean.`);
    process.exit(1);
  }

  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  const existing = await sql`SELECT id FROM churches WHERE slug = 'test-church'`;
  if (existing.length > 0) {
    console.error('test-church already exists; nothing to do.');
    process.exit(1);
  }

  const church = randomUUID();
  const users = { admin: randomUUID(), leader: randomUUID(), member: randomUUID() };
  const group = randomUUID();
  const m = { admin: randomUUID(), leader: randomUUID(), t1: randomUUID(), t2: randomUUID(), t3: randomUUID() };

  await sql.transaction([
    sql`INSERT INTO churches (id, slug, name, timezone, default_language,
          group_label_singular_en, group_label_plural_en, group_label_singular_es, group_label_plural_es)
        VALUES (${church}, 'test-church', 'Test Church', 'America/Los_Angeles', 'en',
          'Life Group', 'Life Groups', 'Grupo de Vida', 'Grupos de Vida')`,
    sql`SELECT set_config('app.church_id', ${church}, true)`,
    sql`INSERT INTO users (id, name, email) VALUES
          (${users.admin}, 'Tess Admin', 'tess.admin@test-church.invalid'),
          (${users.leader}, 'Leo Leader', 'leo.leader@test-church.invalid'),
          (${users.member}, 'Mia Member', 'mia.member@test-church.invalid')`,
    sql`INSERT INTO church_memberships (user_id, church_id, role) VALUES
          (${users.admin}, ${church}, 'admin'), (${users.leader}, ${church}, 'group_leader'), (${users.member}, ${church}, 'member')`,
    sql`INSERT INTO groups (id, church_id, name, meeting_day, meeting_time, address_street, address_city, address_state, address_zip, latitude, longitude)
        VALUES (${group}, ${church}, 'Westside Life Group', 'Thursday', '19:00', '1000 SW Broadway', 'Portland', 'OR', '97205', 45.5163, -122.6834)`,
    sql`INSERT INTO members (id, church_id, user_id, group_id, first_name, last_name, email, phone, date_of_birth, address_street, address_city, address_state, address_zip, latitude, longitude) VALUES
          (${m.admin}, ${church}, ${users.admin}, NULL, 'Tess', 'Admin', 'tess.admin@test-church.invalid', '555-0101', '1985-04-02', '1 Pine St', 'Portland', 'OR', '97204', 45.5202, -122.6742),
          (${m.leader}, ${church}, ${users.leader}, ${group}, 'Leo', 'Leader', 'leo.leader@test-church.invalid', '555-0102', '1980-08-15', '2 Oak St', 'Portland', 'OR', '97205', 45.5190, -122.6800),
          (${m.t1}, ${church}, ${users.member}, ${group}, 'Mia', 'Member', 'mia.member@test-church.invalid', '555-0103', '1992-12-01', '3 Elm St', 'Portland', 'OR', '97209', 45.5260, -122.6850),
          (${m.t2}, ${church}, NULL, ${group}, 'Noah', 'Newcomer', NULL, NULL, '2014-03-03', NULL, NULL, NULL, NULL, NULL, NULL),
          (${m.t3}, ${church}, NULL, NULL, 'Olivia', 'Outside', 'olivia@test-church.invalid', '555-0105', NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
    sql`UPDATE groups SET pastor_id = ${m.leader}, host_id = ${m.leader} WHERE id = ${group}`,
    sql`INSERT INTO attendance_sessions (church_id, date, attendance_type, group_id, recorded_by) VALUES
          (${church}, '2026-11-19', 'group', ${group}, ${users.leader}),
          (${church}, '2026-11-22', 'sunday_service', NULL, ${users.admin})`,
    sql`INSERT INTO attendance (church_id, group_id, member_id, date, attendance_type) VALUES
          (${church}, ${group}, ${m.leader}, '2026-11-19', 'group'), (${church}, ${group}, ${m.t1}, '2026-11-19', 'group'),
          (${church}, NULL, ${m.t1}, '2026-11-22', 'sunday_service'), (${church}, NULL, ${m.admin}, '2026-11-22', 'sunday_service')`,
    sql`INSERT INTO prayer_requests (church_id, title, description, user_id, member_id, visibility, group_id) VALUES
          (${church}, 'Test Church: new job', 'Pray for the interview on Monday.', ${users.member}, ${m.t1}, 'public', ${group}),
          (${church}, 'Test Church: family', NULL, ${users.member}, ${m.t1}, 'group', ${group})`,
    sql`INSERT INTO pastoral_meetings (church_id, pastor_id, member_id, topic_key, meeting_date, notes)
        VALUES (${church}, ${users.leader}, ${m.t1}, 'group', '2026-11-20', 'Test Church meeting notes')`,
    sql`INSERT INTO member_flags (church_id, member_id, created_by, flag_color, description)
        VALUES (${church}, ${m.t1}, ${users.leader}, 'yellow', 'Test Church: check in after the move')`,
    sql`INSERT INTO calendar_events (church_id, title_en, title_es, category, start_date, end_date, start_time, end_time, visibility, created_by) VALUES
          (${church}, 'Test Church leaders retreat', 'Retiro de líderes (Test Church)', 'special_event', '2026-12-05', '2026-12-05', '09:00', '15:00', 'leaders', ${users.admin}),
          (${church}, 'Life Group night', NULL, 'group', '2026-12-03', '2026-12-03', '19:00', '21:00', 'members', ${users.admin})`,
    sql`INSERT INTO directory_visibility (church_id, scope, scope_id, field, level, updated_by)
        VALUES (${church}, 'church', ${church}, 'phone', 'church', ${users.admin})`,
  ]);

  console.log(`Created Test Church (${church}): 3 accounts (no passwords), 5 members, 1 group, attendance, prayer, pastoral and calendar data.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
