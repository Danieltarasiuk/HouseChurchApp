import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { newTestDb, type TestDb } from './helpers/db';
import { seedChurch, U, M, GROUP, CHURCH } from './helpers/fixtures';

/**
 * Every migration, down and back up, on a database built from schema.sql
 * (the state after the last migration) holding CityChurch data with a row
 * for every renamed value. The dev branch round trips (each up, down, up)
 * are the check against real data; this keeps the chain honest in CI.
 *
 *   003 down → 002 down → 001 down → 001 up → 002 up → 003 up
 */
const file = (name: string) => readFileSync(path.resolve(__dirname, '../db/migrations', name), 'utf8');

let db: TestDb;

const catalog = async () => ({
  columns: await db.sql(`SELECT table_name, column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1, 2`),
  constraints: await db.sql(`SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY 1, 2`),
  indexes: await db.sql(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1`),
  rls: await db.sql(`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' ORDER BY 1`),
  policies: await db.sql(`SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2`),
  triggers: await db.sql(`SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY 1`),
});

const hasColumn = async (table: string, column: string) =>
  (await db.sql(`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`, [table, column])).length > 0;

/** The data every step must keep (by the names of the step it runs after). */
const groupData = async (table: 'groups' | 'house_churches', col: 'group_id' | 'house_church_id') => ({
  groups: await db.sql(`SELECT id, name, pastor_id FROM ${table} ORDER BY id`),
  members: await db.sql(`SELECT id, ${col} AS g FROM members ORDER BY id`),
  prayers: await db.sql(`SELECT title, visibility, ${col} AS g FROM prayer_requests ORDER BY title`),
  attendance: await db.sql(`SELECT member_id, attendance_type FROM attendance ORDER BY member_id, attendance_type`),
  sessions: await db.sql(`SELECT attendance_type FROM attendance_sessions ORDER BY attendance_type`),
  events: await db.sql(`SELECT title_en, category FROM calendar_events ORDER BY title_en`),
  topics: await db.sql(`SELECT topic_key FROM pastoral_meetings ORDER BY topic_key`),
});

beforeAll(async () => {
  db = await newTestDb();
  await seedChurch(db, { testChurch: false });
  const C = CHURCH.city;
  await db.sql(`INSERT INTO prayer_requests (church_id, title, user_id, visibility, group_id) VALUES ($3, 'g', $1, 'group', $2), ($3, 'p', $1, 'public', NULL)`, [U.memberA1, GROUP.A, C]);
  await db.sql(`INSERT INTO attendance (church_id, member_id, group_id, date, attendance_type) VALUES ($3, $1, $2, '2026-11-22', 'group'), ($3, $1, NULL, '2026-11-22', 'sunday_service')`, [M.A1, GROUP.A, C]);
  await db.sql(`INSERT INTO attendance_sessions (church_id, date, attendance_type, group_id) VALUES ($2, '2026-11-22', 'group', $1), ($2, '2026-11-22', 'sunday_service', NULL)`, [GROUP.A, C]);
  await db.sql(`INSERT INTO directory_visibility (church_id, scope, scope_id, field, level) VALUES ($2, 'group', $1, 'phone', 'group'), ($2, 'church', $2, 'phone', 'church')`, [GROUP.A, C]);
  await db.sql(`INSERT INTO calendar_events (church_id, title_en, category, start_date, end_date) VALUES ($1, 'Group night', 'group', '2027-01-13', '2027-01-13'), ($1, 'Brunch', 'brunch', '2027-01-14', '2027-01-14')`, [C]);
  await db.sql(`INSERT INTO pastoral_meetings (church_id, pastor_id, member_id, topic_key, meeting_date) VALUES ($3, $1, $2, 'group', '2026-11-20'), ($3, $1, $2, 'discipleship', '2026-11-21')`, [U.pastorA, M.A1, C]);
  // A pending sign-up, so status survives the trip too.
  const [{ id }] = await db.sql(`INSERT INTO users (name, email) VALUES ('Waiting', 'w@example.test') RETURNING id`);
  await db.sql(`INSERT INTO church_memberships (user_id, church_id, role, status) VALUES ($1, $2, 'member', 'pending')`, [id, C]);
}, 30_000);

describe('migrations 001–003, down and back up', () => {
  it('each step restores the previous one, and the chain ends where it started', async () => {
    const start = await catalog();
    const startData = await groupData('groups', 'group_id');
    const startRoles = await db.sql(`SELECT user_id::text AS id, role, status FROM church_memberships ORDER BY user_id`);

    // 003 down: roles back on users, row-level security off, church_id optional.
    await db.pg.exec(file('003_churches_contract.down.sql'));
    expect(await db.sql(`SELECT id::text, role, status FROM users ORDER BY id`)).toEqual(startRoles);
    expect((await catalog()).rls.filter((r) => r.relrowsecurity)).toEqual([]);
    expect(await db.sql(`SELECT is_nullable, column_default FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'church_id'`))
      .toEqual([{ is_nullable: 'YES', column_default: "'c1c1c1c1-0000-4000-8000-000000000001'::uuid" }]);
    expect(await db.sql(`SELECT scope_id::text FROM directory_visibility WHERE scope = 'church'`)).toEqual([{ scope_id: CHURCH.city }]);

    // 002 down: single-church again.
    await db.pg.exec(file('002_churches_expand.down.sql'));
    expect(await hasColumn('members', 'church_id')).toBe(false);
    expect(await hasColumn('users', 'is_platform_admin')).toBe(false);
    expect(await db.sql(`SELECT to_regclass('churches') AS c, to_regclass('church_memberships') AS m`)).toEqual([{ c: null, m: null }]);
    expect(await db.sql(`SELECT scope_id FROM directory_visibility WHERE scope = 'church'`)).toEqual([{ scope_id: null }]);
    expect(await db.sql(`SELECT id::text, role, status FROM users ORDER BY id`)).toEqual(startRoles);

    // 001 down and up: house churches and back.
    await db.pg.exec(file('001_rename_groups.down.sql'));
    expect((await db.sql(`SELECT count(*)::int AS n FROM users WHERE role = 'house_church_pastor'`))[0].n).toBe(3);
    expect(await groupData('house_churches', 'house_church_id')).toMatchObject({
      prayers: [{ visibility: 'house_church' }, { visibility: 'public' }],
      events: [{ category: 'brunch' }, { category: 'house_church' }],
      topics: [{ topic_key: 'discipleship' }, { topic_key: 'house_church' }],
    });
    await db.pg.exec(file('001_rename_groups.sql'));

    // 002 and 003 up: back to schema.sql, with the same data and roles.
    await db.pg.exec(file('002_churches_expand.sql'));
    expect(await db.sql(`SELECT user_id::text AS id, role, status FROM church_memberships ORDER BY user_id`)).toEqual(startRoles);
    await db.pg.exec(file('003_churches_contract.sql'));

    expect(await catalog()).toEqual(start);
    expect(await groupData('groups', 'group_id')).toEqual(startData);
    expect(await db.sql(`SELECT user_id::text AS id, role, status FROM church_memberships ORDER BY user_id`)).toEqual(startRoles);
    expect(await db.sql(`SELECT scope, scope_id::text FROM directory_visibility WHERE scope = 'church'`)).toEqual([{ scope: 'church', scope_id: CHURCH.city }]);
  });

  it('002 copies role changes the old code makes until 003, and 003 gives late sign-ups a membership', async () => {
    db = await newTestDb();
    await seedChurch(db, { testChurch: false });
    await db.pg.exec(file('003_churches_contract.down.sql'));
    // Old code, between 002 and the deploy: a promotion and a new sign-up.
    await db.sql(`UPDATE users SET role = 'group_leader' WHERE id = $1`, [U.memberA1]);
    await db.sql(`INSERT INTO users (id, name, email, role, status) VALUES ('00000000-0000-0000-0000-0000000000e9', 'Late', 'late@example.test', 'member', 'pending')`);
    expect(await db.sql(`SELECT role FROM church_memberships WHERE user_id = $1`, [U.memberA1])).toEqual([{ role: 'group_leader' }]);
    await db.pg.exec(file('003_churches_contract.sql'));
    expect(await db.sql(`SELECT church_id::text, role, status FROM church_memberships WHERE user_id = '00000000-0000-0000-0000-0000000000e9'`))
      .toEqual([{ church_id: CHURCH.city, role: 'member', status: 'pending' }]);
  });

  it('each migration is one transaction: a failure part-way leaves nothing changed', async () => {
    db = await newTestDb(); // schema.sql = already migrated
    const before = await catalog();
    for (const name of ['001_rename_groups.sql', '002_churches_expand.sql', '003_churches_contract.sql']) {
      await expect(db.pg.exec(file(name))).rejects.toThrow();
      await db.pg.exec('ROLLBACK');
    }
    expect(await catalog()).toEqual(before);
  });

  it('002 refuses to run without the kinly_app role', async () => {
    db = await newTestDb();
    await seedChurch(db, { testChurch: false });
    await db.pg.exec(file('003_churches_contract.down.sql'));
    await db.pg.exec(file('002_churches_expand.down.sql'));
    await db.pg.exec(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM kinly_app; REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM kinly_app;
                      REVOKE USAGE ON SCHEMA public FROM kinly_app; DROP ROLE kinly_app;`);
    await expect(db.pg.exec(file('002_churches_expand.sql'))).rejects.toThrow(/kinly_app does not exist/);
    await db.pg.exec('ROLLBACK');
    expect(await hasColumn('members', 'church_id')).toBe(false);
  });
});
