import type { TestDb } from './db';

/**
 * Two churches.
 *
 * CityChurch (church #1, the permission tests' church):
 *   group A  pastor: pastorA   members: mA1 (user memberA1), mA2 (no account)
 *   group B  pastor: pastorB   members: mB1 (user memberB1), mB2 (no account)
 *   no group: mN (user memberNoGroup); pastorNone (pastor role, pastors nothing)
 *   admin (no group)
 *
 * Test Church (seeded unless { testChurch: false }):
 *   group T  leader: leaderT   members: mT1 (user memberT), mT2 (no account)
 *   adminT; data in every church-owned table (attendance, prayer, pastoral,
 *   calendar, directory settings, progress, Incubator, sync log), no
 *   Planning Center token, timezone America/Los_Angeles.
 *
 * Across churches:
 *   both      member of CityChurch (member mBothCity) and admin of Test
 *             Church (member mBothTest)
 *   platform  platform admin with no membership at all
 *
 * Every member has a phone, email, address, birthday (1990-03-04 unless
 * noted), household and attendance note, so any leak is visible.
 */
export const CHURCH = {
  city: 'c1c1c1c1-0000-4000-8000-000000000001',
  test: 'c2c2c2c2-0000-4000-8000-000000000002',
} as const;

export const U = {
  admin: '00000000-0000-0000-0000-0000000000a1',
  pastorA: '00000000-0000-0000-0000-0000000000a2',
  pastorB: '00000000-0000-0000-0000-0000000000a3',
  pastorNone: '00000000-0000-0000-0000-0000000000a4',
  memberA1: '00000000-0000-0000-0000-0000000000a5',
  memberB1: '00000000-0000-0000-0000-0000000000a6',
  memberNoGroup: '00000000-0000-0000-0000-0000000000a7',
  adminT: '00000000-0000-0000-0000-0000000000b1',
  leaderT: '00000000-0000-0000-0000-0000000000b2',
  memberT: '00000000-0000-0000-0000-0000000000b3',
  both: '00000000-0000-0000-0000-0000000000c1',
  platform: '00000000-0000-0000-0000-0000000000d1',
} as const;

export const GROUP = {
  A: '00000000-0000-0000-0000-00000000000a',
  B: '00000000-0000-0000-0000-00000000000b',
  T: '00000000-0000-0000-0000-0000000000f1',
} as const;

export const M = {
  admin: '00000000-0000-0000-0000-000000000101',
  pastorA: '00000000-0000-0000-0000-000000000102',
  pastorB: '00000000-0000-0000-0000-000000000103',
  pastorNone: '00000000-0000-0000-0000-000000000104',
  A1: '00000000-0000-0000-0000-000000000105',
  A2: '00000000-0000-0000-0000-000000000106',
  B1: '00000000-0000-0000-0000-000000000107',
  B2: '00000000-0000-0000-0000-000000000108',
  N: '00000000-0000-0000-0000-000000000109',
  bothCity: '00000000-0000-0000-0000-00000000010a',
  adminT: '00000000-0000-0000-0000-000000000201',
  leaderT: '00000000-0000-0000-0000-000000000202',
  T1: '00000000-0000-0000-0000-000000000203',
  T2: '00000000-0000-0000-0000-000000000204',
  bothTest: '00000000-0000-0000-0000-000000000205',
} as const;

/** Each CityChurch user's role there (the permission tests' roles). */
export const ROLE_OF: Record<keyof typeof U, string> = {
  admin: 'admin',
  pastorA: 'group_leader',
  pastorB: 'group_leader',
  pastorNone: 'group_leader',
  memberA1: 'member',
  memberB1: 'member',
  memberNoGroup: 'member',
  adminT: 'admin',
  leaderT: 'group_leader',
  memberT: 'member',
  both: 'member',
  platform: 'admin',
};

/** Test Church's own ids for the rows it owns besides members and groups. */
export const T_ROW = {
  prayerPublic: '00000000-0000-0000-0000-000000000301',
  prayerGroup: '00000000-0000-0000-0000-000000000302',
  meeting: '00000000-0000-0000-0000-000000000303',
  note: '00000000-0000-0000-0000-000000000304',
  flag: '00000000-0000-0000-0000-000000000305',
  event: '00000000-0000-0000-0000-000000000306',
  session: '00000000-0000-0000-0000-000000000307',
} as const;

const CITY_USERS: (keyof typeof U)[] = ['admin', 'pastorA', 'pastorB', 'pastorNone', 'memberA1', 'memberB1', 'memberNoGroup'];

export async function seedChurch(db: TestDb, opts: { testChurch?: boolean } = {}) {
  const withTest = opts.testChurch !== false;
  await db.sql(
    `INSERT INTO churches (id, slug, name, timezone, default_language,
       group_label_singular_en, group_label_plural_en, group_label_singular_es, group_label_plural_es,
       checkins_event_name, church_center_url, google_calendar_id)
     VALUES ($1, 'citychurch', 'CityChurch', 'America/New_York', 'en',
       'House Church', 'House Churches', 'Iglesia en Casa', 'Iglesias en Casa',
       'Reunión Dominical Español', 'https://citychurchmia.churchcenter.com', 'city-calendar@group.calendar.google.com')`,
    [CHURCH.city]
  );

  const users = withTest ? (Object.keys(U) as (keyof typeof U)[]) : CITY_USERS;
  for (const key of users) {
    await db.sql('INSERT INTO users (id, name, email, is_platform_admin) VALUES ($1, $2, $3, $4)',
      [U[key], key, `${key}@example.test`, key === 'platform']);
  }
  for (const key of CITY_USERS) {
    await db.sql('INSERT INTO church_memberships (user_id, church_id, role) VALUES ($1, $2, $3)', [U[key], CHURCH.city, ROLE_OF[key]]);
  }
  await db.sql(`INSERT INTO groups (id, church_id, name) VALUES ($1, $3, 'Group A'), ($2, $3, 'Group B')`, [GROUP.A, GROUP.B, CHURCH.city]);

  const member = (churchId: string, id: string, userId: string | null, groupId: string | null, name: string, dob = '1990-03-04') =>
    db.sql(
      `INSERT INTO members (church_id, id, user_id, group_id, first_name, last_name, email, phone,
         address_street, address_city, address_state, address_zip, latitude, longitude,
         date_of_birth, pco_household_id, household_name, attendance_note, is_active)
       VALUES ($7, $1, $2, $3, $4, 'Test', $5, '555-0100', '1 Main St', 'Miami', 'FL', '33101', 25.7, -80.2,
         $6, 'hh-' || $4, $4 || ' household', 'note about ' || $4, true)`,
      [id, userId, groupId, name, `${name.toLowerCase()}@example.test`, dob, churchId]
    );
  const city = (id: string, userId: string | null, groupId: string | null, name: string, dob?: string) => member(CHURCH.city, id, userId, groupId, name, dob);
  await city(M.admin, U.admin, null, 'Admin');
  await city(M.pastorA, U.pastorA, GROUP.A, 'PastorA');
  await city(M.pastorB, U.pastorB, GROUP.B, 'PastorB');
  await city(M.pastorNone, U.pastorNone, null, 'PastorNone');
  await city(M.A1, U.memberA1, GROUP.A, 'A1');
  await city(M.A2, null, GROUP.A, 'A2', '2012-06-15'); // a minor
  await city(M.B1, U.memberB1, GROUP.B, 'B1');
  await city(M.B2, null, GROUP.B, 'B2');
  await city(M.N, U.memberNoGroup, null, 'N');

  await db.sql('UPDATE groups SET pastor_id = $1 WHERE id = $2', [M.pastorA, GROUP.A]);
  await db.sql('UPDATE groups SET pastor_id = $1 WHERE id = $2', [M.pastorB, GROUP.B]);

  if (withTest) await seedTestChurch(db, member);
}

async function seedTestChurch(
  db: TestDb,
  member: (churchId: string, id: string, userId: string | null, groupId: string | null, name: string, dob?: string) => Promise<unknown>
) {
  const T = CHURCH.test;
  await db.sql(
    `INSERT INTO churches (id, slug, name, timezone) VALUES ($1, 'test-church', 'Test Church', 'America/Los_Angeles')`,
    [T]
  );
  // Memberships: Test Church's own people, and \`both\` (member of CityChurch, admin here).
  await db.sql(
    `INSERT INTO church_memberships (user_id, church_id, role) VALUES
       ($1, $6, 'admin'), ($2, $6, 'group_leader'), ($3, $6, 'member'), ($4, $6, 'admin'), ($4, $5, 'member')`,
    [U.adminT, U.leaderT, U.memberT, U.both, CHURCH.city, T]
  );
  await db.sql(`INSERT INTO groups (id, church_id, name, address_city) VALUES ($1, $2, 'Group T', 'Portland')`, [GROUP.T, T]);
  await member(CHURCH.city, M.bothCity, U.both, null, 'BothCity');
  await member(T, M.adminT, U.adminT, null, 'AdminT');
  await member(T, M.leaderT, U.leaderT, GROUP.T, 'LeaderT');
  await member(T, M.T1, U.memberT, GROUP.T, 'T1');
  await member(T, M.T2, null, GROUP.T, 'T2', '2013-02-02'); // a minor
  await member(T, M.bothTest, U.both, GROUP.T, 'BothTest');
  await db.sql('UPDATE groups SET pastor_id = $1 WHERE id = $2', [M.leaderT, GROUP.T]);
  // Test Church's members have pco ids that also exist... nowhere else: per-church uniqueness is tested in sync tests.
  await db.sql(`UPDATE members SET pco_id = 'pco-' || first_name WHERE church_id = $1`, [T]);

  await db.sql(
    `INSERT INTO attendance (church_id, group_id, member_id, date, attendance_type) VALUES
       ($1, $2, $3, '2026-11-18', 'group'), ($1, NULL, $3, '2026-11-22', 'sunday_service')`,
    [T, GROUP.T, M.T1]
  );
  await db.sql(
    `INSERT INTO attendance_sessions (id, church_id, date, attendance_type, group_id, recorded_by) VALUES
       ($1, $2, '2026-11-18', 'group', $3, $4), (gen_random_uuid(), $2, '2026-11-22', 'sunday_service', NULL, $4)`,
    [T_ROW.session, T, GROUP.T, U.leaderT]
  );
  await db.sql(
    `INSERT INTO prayer_requests (id, church_id, title, user_id, member_id, visibility, group_id) VALUES
       ($1, $3, 'T public prayer', $4, $5, 'public', $6), ($2, $3, 'T group prayer', $4, $5, 'group', $6)`,
    [T_ROW.prayerPublic, T_ROW.prayerGroup, T, U.memberT, M.T1, GROUP.T]
  );
  await db.sql(
    `INSERT INTO pastoral_meetings (id, church_id, pastor_id, member_id, topic_key, meeting_date, notes)
     VALUES ($1, $2, $3, $4, 'group', '2026-11-20', 'T meeting notes')`,
    [T_ROW.meeting, T, U.leaderT, M.T1]
  );
  await db.sql(`INSERT INTO pastoral_notes (id, church_id, pastor_id, member_id, content) VALUES ($1, $2, $3, $4, 'T private note')`,
    [T_ROW.note, T, U.leaderT, M.T1]);
  await db.sql(
    `INSERT INTO member_flags (id, church_id, member_id, created_by, flag_color, description) VALUES ($1, $2, $3, $4, 'red', 'T red flag')`,
    [T_ROW.flag, T, M.T1, U.leaderT]
  );
  await db.sql(
    `INSERT INTO calendar_events (id, church_id, title_en, category, start_date, end_date, visibility, created_by)
     VALUES ($1, $2, 'T leaders retreat', 'group', '2026-11-28', '2026-11-28', 'members', $3)`,
    [T_ROW.event, T, U.adminT]
  );
  await db.sql(
    `INSERT INTO directory_visibility (church_id, scope, scope_id, field, level, updated_by) VALUES ($1, 'church', $1, 'phone', 'church', $2)`,
    [T, U.adminT]
  );
  await db.sql(`INSERT INTO discipleship_progress (church_id, user_id, week, day, answers) VALUES ($1, $2, 1, 1, '{"0-reflect":"T answer"}')`, [T, U.memberT]);
  await db.sql(`INSERT INTO incubator_access (church_id, user_id, granted_by, is_active) VALUES ($1, $2, $3, true)`, [T, U.leaderT, U.adminT]);
  await db.sql(`INSERT INTO sync_log (church_id, source, success, detail, synced_count) VALUES ($1, 'manual', true, 'T sync', 5)`, [T]);
}
