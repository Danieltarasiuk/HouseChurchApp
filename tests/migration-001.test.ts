import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { newTestDb, type TestDb } from './helpers/db';
import { seedChurch, U, M, GROUP } from './helpers/fixtures';

/**
 * db/migrations/001_rename_groups: down then up on a database built from
 * schema.sql (which is the "up" state), with a row for every renamed value.
 * The dev branch round trip (up, down, up) is the check against real data.
 */
const file = (name: string) => readFileSync(path.resolve(__dirname, '../db/migrations', name), 'utf8');
const UP = file('001_rename_groups.sql');
const DOWN = file('001_rename_groups.down.sql');

let db: TestDb;

const catalog = async () => ({
  columns: await db.sql(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1, 2`),
  constraints: await db.sql(`SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY 1, 2`),
  indexes: await db.sql(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1`),
});

const values = async (table: 'groups' | 'house_churches', col: 'group_id' | 'house_church_id') => ({
  groups: await db.sql(`SELECT id, name, pastor_id FROM ${table} ORDER BY id`),
  roles: await db.sql(`SELECT id, role FROM users ORDER BY id`),
  members: await db.sql(`SELECT id, ${col} AS g FROM members ORDER BY id`),
  prayers: await db.sql(`SELECT title, visibility, ${col} AS g FROM prayer_requests ORDER BY title`),
  attendance: await db.sql(`SELECT member_id, attendance_type, ${col} AS g FROM attendance ORDER BY member_id, attendance_type`),
  sessions: await db.sql(`SELECT attendance_type, ${col} AS g FROM attendance_sessions ORDER BY attendance_type`),
  layers: await db.sql(`SELECT scope, scope_id, level FROM directory_visibility ORDER BY scope`),
  events: await db.sql(`SELECT title_en, category FROM calendar_events ORDER BY title_en`),
  topics: await db.sql(`SELECT topic_key FROM pastoral_meetings ORDER BY topic_key`),
});

beforeAll(async () => {
  db = await newTestDb();
  await seedChurch(db);
  await db.sql(`INSERT INTO prayer_requests (title, user_id, visibility, group_id) VALUES ('g', $1, 'group', $2), ('p', $1, 'public', NULL)`, [U.memberA1, GROUP.A]);
  await db.sql(`INSERT INTO attendance (member_id, group_id, date, attendance_type) VALUES ($1, $2, '2026-11-22', 'group'), ($1, NULL, '2026-11-22', 'sunday_service')`, [M.A1, GROUP.A]);
  await db.sql(`INSERT INTO attendance_sessions (date, attendance_type, group_id) VALUES ('2026-11-22', 'group', $1), ('2026-11-22', 'sunday_service', NULL)`, [GROUP.A]);
  await db.sql(`INSERT INTO directory_visibility (scope, scope_id, field, level) VALUES ('group', $1, 'phone', 'group'), ('church', NULL, 'phone', 'church')`, [GROUP.A]);
  await db.sql(`INSERT INTO calendar_events (title_en, category, start_date, end_date) VALUES ('Group night', 'group', '2027-01-13', '2027-01-13'), ('Brunch', 'brunch', '2027-01-14', '2027-01-14')`);
  await db.sql(`INSERT INTO pastoral_meetings (pastor_id, member_id, topic_key, meeting_date) VALUES ($1, $2, 'group', '2026-11-20'), ($1, $2, 'discipleship', '2026-11-21')`, [U.pastorA, M.A1]);
}, 30_000);

describe('migration 001 (house churches → groups)', () => {
  it('down restores every old name and value, then up restores schema.sql exactly', async () => {
    const upCatalog = await catalog();
    const upValues = await values('groups', 'group_id');

    await db.pg.exec(DOWN);
    const down = await catalog();
    const downValues = await values('house_churches', 'house_church_id');

    // Old names are back, and nothing says group(s) any more.
    const names = [...down.columns.map((c) => `${c.table_name}.${c.column_name}`), ...down.constraints.map((c) => c.conname), ...down.indexes.map((i) => i.indexname)];
    expect(names).toContain('house_churches.id');
    expect(names).toContain('members.house_church_id');
    expect(names).toContain('idx_prayer_house_church');
    expect(names.filter((n) => /group/.test(n))).toEqual([]);
    // directory_visibility.level 'group' ("their group") predates the rename and stays.
    const checks = JSON.stringify(down.constraints.filter((c) => c.conname !== 'directory_visibility_level_check'));
    expect(checks).not.toMatch(/'group'|group_leader/);
    expect(checks).toMatch(/house_church_pastor/);

    // Every stored value maps back; nothing else moved.
    expect(downValues.roles.filter((r) => r.role === 'house_church_pastor')).toHaveLength(3);
    expect(downValues.prayers.map((p) => p.visibility)).toEqual(['house_church', 'public']);
    expect(downValues.attendance.map((a) => a.attendance_type)).toEqual(['house_church', 'sunday_service']);
    expect(downValues.sessions.map((s) => s.attendance_type)).toEqual(['house_church', 'sunday_service']);
    expect(downValues.layers.map((l) => `${l.scope}/${l.level}`)).toEqual(['church/church', 'house_church/group']);
    expect(downValues.events.map((e) => e.category)).toEqual(['brunch', 'house_church']);
    expect(downValues.topics.map((t) => t.topic_key)).toEqual(['discipleship', 'house_church']);
    expect(downValues.members).toEqual(upValues.members);
    expect(downValues.groups).toEqual(upValues.groups);

    await db.pg.exec(UP);
    expect(await catalog()).toEqual(upCatalog);
    expect(await values('groups', 'group_id')).toEqual(upValues);
  });

  it('is one transaction: a failure part-way leaves nothing changed', async () => {
    db = await newTestDb(); // schema.sql = already migrated
    const before = await catalog();
    // Already in the "up" state, so the first rename fails and the whole file rolls back.
    await expect(db.pg.exec(UP)).rejects.toThrow();
    await db.pg.exec('ROLLBACK');
    expect(await catalog()).toEqual(before);
  });
});
