import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { current, setupTestDb, cookieJar } from './helpers/db';
import { seedChurch, U, M, GROUP, CHURCH, T_ROW } from './helpers/fixtures';
import { newFakePco, fakeFetch } from './helpers/fakePco';

vi.mock('@/lib/dbDriver', async () => (await import('./helpers/db')).testDriver);
vi.mock('next/headers', async () => (await import('./helpers/db')).headersMock);

let sessionUser: { id: string } | null = null;
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionUser ? { user: sessionUser } : null) }));

/**
 * Multi-church isolation: CityChurch's people can never read, change or
 * delete Test Church's data through any API route, even by passing its ids;
 * the database itself refuses church data with no church set; a user in
 * both churches sees one at a time; a platform admin reaches both; and the
 * cron syncs each church in its own context.
 */

const sql = (text: string, params?: unknown[]) => current.db!.sql(text, params);
const as = (who: keyof typeof U | null) => { sessionUser = who ? { id: U[who] } : null; };
const req = (path: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? 'GET',
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body), headers: { 'content-type': 'application/json' } } : {}),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const route = (path: string) => import(`@/app/api/${path}/route`);

setupTestDb({ beforeAll, beforeEach, afterEach }, seedChurch);
beforeEach(() => {
  as(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

/** Strings that only Test Church's data contains. */
const T_MARKERS = [
  CHURCH.test, GROUP.T, U.adminT, U.leaderT, U.memberT, M.adminT, M.leaderT, M.T1, M.T2, M.bothTest,
  ...Object.values(T_ROW),
  'AdminT', 'LeaderT', 'BothTest', 'Group T', 'Test Church', 't1@example.test', 'T public prayer', 'T group prayer',
  'T meeting notes', 'T private note', 'T red flag', 'T leaders retreat', 'T sync', 'T answer', 'Portland',
];
const leaks = (body: unknown) => {
  const text = JSON.stringify(body);
  return T_MARKERS.filter((m) => text.includes(m));
};

const RLS_TABLES = [
  'groups', 'members', 'attendance', 'attendance_sessions', 'calendar_events', 'prayer_requests',
  'pastoral_meetings', 'pastoral_notes', 'member_flags', 'directory_visibility', 'sync_log', 'pco_tokens',
  'discipleship_progress', 'incubator_progress', 'incubator_access',
] as const;

/** Everything Test Church owns, as the superuser sees it. */
async function testChurchSnapshot() {
  const out: Record<string, unknown> = {};
  for (const t of RLS_TABLES) out[t] = await sql(`SELECT * FROM ${t} WHERE church_id = $1 ORDER BY id`, [CHURCH.test]);
  out.memberships = await sql(`SELECT user_id, role, status FROM church_memberships WHERE church_id = $1 ORDER BY user_id`, [CHURCH.test]);
  out.church = await sql(`SELECT * FROM churches WHERE id = $1`, [CHURCH.test]);
  out.users = await sql(`SELECT id, name, email FROM users WHERE id = ANY($1::uuid[]) ORDER BY id`, [[U.adminT, U.leaderT, U.memberT, U.both]]);
  return JSON.parse(JSON.stringify(out));
}

// ---------------------------------------------------------------------------
// Reads: nothing of Test Church's reaches CityChurch, even by its ids
// ---------------------------------------------------------------------------

const READS: [string, () => Promise<Response>][] = [
  ['members', async () => (await route('members')).GET()],
  ['groups', async () => (await route('groups')).GET()],
  ['dashboard', async () => (await route('dashboard')).GET()],
  ['me', async () => (await route('me')).GET()],
  ['church', async () => (await route('church')).GET()],
  ['prayer', async () => (await route('prayer')).GET()],
  ['calendar-events', async () => (await route('calendar-events')).GET(req('/api/calendar-events?from=2026-11-01&to=2026-12-31'))],
  ['calendar-events/[id] T', async () => (await route('calendar-events/[id]')).GET(req(`/api/calendar-events/${T_ROW.event}`), params(T_ROW.event))],
  ['pastoral/members', async () => (await route('pastoral/members')).GET(req('/api/pastoral/members'))],
  ['pastoral/members ?group_id=T', async () => (await route('pastoral/members')).GET(req(`/api/pastoral/members?group_id=${GROUP.T}`))],
  ['pastoral/meetings', async () => (await route('pastoral/meetings')).GET(req('/api/pastoral/meetings'))],
  ['pastoral/meetings ?member_id=T1', async () => (await route('pastoral/meetings')).GET(req(`/api/pastoral/meetings?member_id=${M.T1}`))],
  ['pastoral/flags ?member_id=T1', async () => (await route('pastoral/flags')).GET(req(`/api/pastoral/flags?member_id=${M.T1}`))],
  ['pastoral/flags/summary', async () => (await route('pastoral/flags/summary')).GET()],
  ['pastoral/notes ?member_id=T1', async () => (await route('pastoral/notes')).GET(req(`/api/pastoral/notes?member_id=${M.T1}`))],
  ['attendance ?member_id=T1', async () => (await route('attendance')).GET(req(`/api/attendance?member_id=${M.T1}`))],
  ['attendance/existing T group', async () => (await route('attendance/existing')).GET(req(`/api/attendance/existing?date=2026-11-18&attendance_type=group&group_id=${GROUP.T}`))],
  ['attendance/existing Sunday', async () => (await route('attendance/existing')).GET(req('/api/attendance/existing?date=2026-11-22&attendance_type=sunday_service'))],
  ['attendance/history T group', async () => (await route('attendance/history')).GET(req(`/api/attendance/history?attendance_type=group&months=4&group_id=${GROUP.T}`))],
  ['attendance/history Sunday', async () => (await route('attendance/history')).GET(req('/api/attendance/history?attendance_type=sunday_service&months=4'))],
  ['attendance/sessions', async () => (await route('attendance/sessions')).GET(req('/api/attendance/sessions?attendance_type=group&months=4'))],
  ['directory-visibility church', async () => (await route('directory-visibility')).GET(req('/api/directory-visibility?scope=church'))],
  ['directory-visibility ?scope=group&id=T', async () => (await route('directory-visibility')).GET(req(`/api/directory-visibility?scope=group&id=${GROUP.T}`))],
  ['directory-visibility ?scope=member&id=T1', async () => (await route('directory-visibility')).GET(req(`/api/directory-visibility?scope=member&id=${M.T1}`))],
  ['settings/users', async () => (await route('settings/users')).GET()],
  ['planning-center/last-sync', async () => (await route('planning-center/last-sync')).GET()],
  ['planning-center/status', async () => (await route('planning-center/status')).GET()],
  ['discipleship/answers', async () => (await route('discipleship/answers')).GET(req('/api/discipleship/answers?week=1&day=1'))],
  ['incubator/day', async () => (await route('incubator/day')).GET(req('/api/incubator/day?week=1&day=1'))],
];

describe('CityChurch never reads Test Church data', () => {
  it.each(['admin', 'pastorA', 'memberA1', 'both'] as const)('every read route, as %s', async (who) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    as(who);
    for (const [name, call] of READS) {
      const res = await call();
      const body = await res.json().catch(() => null);
      expect(leaks(body), `${who} GET ${name} (${res.status})`).toEqual([]);
    }
  });

  it("another church's ids are simply not found", async () => {
    as('admin');
    expect((await (await route('directory-visibility')).GET(req(`/api/directory-visibility?scope=group&id=${GROUP.T}`))).status).toBe(404);
    expect((await (await route('directory-visibility')).GET(req(`/api/directory-visibility?scope=member&id=${M.T1}`))).status).toBe(404);
    const notes = await (await (await route('pastoral/notes')).GET(req(`/api/pastoral/notes?member_id=${M.T1}`))).json();
    expect(notes.notes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Writes: no update or delete reaches Test Church, even by its ids
// ---------------------------------------------------------------------------

const WRITES: [string, () => Promise<Response>][] = [
  ['PATCH groups T', async () => (await route('groups')).PATCH(req('/api/groups', { method: 'PATCH', body: { id: GROUP.T, name: 'hacked' } }))],
  ['POST groups with T pastor', async () => (await route('groups')).POST(req('/api/groups', { method: 'POST', body: { name: 'x', pastor_id: M.leaderT } }))],
  ['PATCH groups with T host', async () => (await route('groups')).PATCH(req('/api/groups', { method: 'PATCH', body: { id: GROUP.A, name: 'Group A', host_id: M.T1 } }))],
  ['PATCH member note T1', async () => (await route('members/[id]/note')).PATCH(req(`/api/members/${M.T1}/note`, { method: 'PATCH', body: { note: 'hacked' } }), params(M.T1))],
  ['POST attendance T group', async () => (await route('attendance')).POST(req('/api/attendance', { method: 'POST', body: { date: '2026-11-25', attendance_type: 'group', group_id: GROUP.T, records: [{ member_id: M.T1, present: true }] } }))],
  ['POST attendance Sunday T member', async () => (await route('attendance')).POST(req('/api/attendance', { method: 'POST', body: { date: '2026-11-22', attendance_type: 'sunday_service', records: [{ member_id: M.T1, present: false }, { member_id: M.T2, present: true }] } }))],
  ['DELETE session T', async () => (await route('attendance/sessions')).DELETE(req('/api/attendance/sessions', { method: 'DELETE', body: { date: '2026-11-18', attendance_type: 'group', group_id: GROUP.T } }))],
  ['PUT directory group T', async () => (await route('directory-visibility')).PUT(req('/api/directory-visibility', { method: 'PUT', body: { scope: 'group', id: GROUP.T, field: 'phone', level: 'church' } }))],
  ['PUT directory member T1', async () => (await route('directory-visibility')).PUT(req('/api/directory-visibility', { method: 'PUT', body: { scope: 'member', id: M.T1, field: 'phone', level: 'church' } }))],
  ['PUT directory church null', async () => (await route('directory-visibility')).PUT(req('/api/directory-visibility', { method: 'PUT', body: { scope: 'church', field: 'phone', level: null } }))],
  ['POST flag T1', async () => (await route('pastoral/flags')).POST(req('/api/pastoral/flags', { method: 'POST', body: { member_id: M.T1, flag_color: 'red', description: 'x' } }))],
  ['PATCH flag T', async () => (await route('pastoral/flags/[id]')).PATCH(req(`/api/pastoral/flags/${T_ROW.flag}`, { method: 'PATCH', body: { is_resolved: true } }), params(T_ROW.flag))],
  ['POST meeting T1', async () => (await route('pastoral/meetings')).POST(req('/api/pastoral/meetings', { method: 'POST', body: { member_id: M.T1, topic_key: 'general', meeting_date: '2026-11-25' } }))],
  ['PATCH meeting T', async () => (await route('pastoral/meetings/[id]')).PATCH(req(`/api/pastoral/meetings/${T_ROW.meeting}`, { method: 'PATCH', body: { notes: 'hacked' } }), params(T_ROW.meeting))],
  ['DELETE meeting T', async () => (await route('pastoral/meetings/[id]')).DELETE(req(`/api/pastoral/meetings/${T_ROW.meeting}`, { method: 'DELETE' }), params(T_ROW.meeting))],
  ['POST note T1', async () => (await route('pastoral/notes')).POST(req('/api/pastoral/notes', { method: 'POST', body: { member_id: M.T1, content: 'x' } }))],
  ['PATCH note T', async () => (await route('pastoral/notes/[id]')).PATCH(req(`/api/pastoral/notes/${T_ROW.note}`, { method: 'PATCH', body: { content: 'hacked' } }), params(T_ROW.note))],
  ['DELETE note T', async () => (await route('pastoral/notes/[id]')).DELETE(req(`/api/pastoral/notes/${T_ROW.note}`, { method: 'DELETE' }), params(T_ROW.note))],
  ['POST prayer for T1', async () => (await route('prayer')).POST(new Request('http://localhost/api/prayer', { method: 'POST', body: JSON.stringify({ title: 'x', member_id: M.T1, visibility: 'group' }) }))],
  ['PATCH prayer T', async () => (await route('prayer')).PATCH(new Request('http://localhost/api/prayer', { method: 'PATCH', body: JSON.stringify({ id: T_ROW.prayerPublic, status: 'answered' }) }))],
  ['DELETE prayer T', async () => (await route('prayer/[id]')).DELETE(req(`/api/prayer/${T_ROW.prayerPublic}`, { method: 'DELETE' }), params(T_ROW.prayerPublic))],
  ['PATCH event T', async () => (await route('calendar-events/[id]')).PATCH(req(`/api/calendar-events/${T_ROW.event}`, { method: 'PATCH', body: { title_en: 'hacked' } }), params(T_ROW.event))],
  ['DELETE event T', async () => (await route('calendar-events/[id]')).DELETE(req(`/api/calendar-events/${T_ROW.event}`, { method: 'DELETE' }), params(T_ROW.event))],
  ['POST event T sync', async () => (await route('calendar-events/[id]/sync')).POST(req(`/api/calendar-events/${T_ROW.event}/sync`, { method: 'POST' }), params(T_ROW.event))],
  ['POST approve memberT', async () => (await route('settings/users/approve')).POST(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ userId: U.memberT, create: true }) }))],
  ['PATCH role adminT', async () => (await route('settings/users')).PATCH(new Request('http://localhost/x', { method: 'PATCH', body: JSON.stringify({ userId: U.adminT, role: 'member' }) }))],
  ['DELETE user memberT', async () => (await route('settings/users')).DELETE(new Request('http://localhost/x', { method: 'DELETE', body: JSON.stringify({ userId: U.memberT }) }))],
  ['DELETE user both', async () => (await route('settings/users')).DELETE(new Request('http://localhost/x', { method: 'DELETE', body: JSON.stringify({ userId: U.both }) }))],
  ['PUT incubator access memberT', async () => (await route('settings/incubator-access')).PUT(new Request('http://localhost/x', { method: 'PUT', body: JSON.stringify({ userId: U.memberT, active: true }) }))],
  ['PUT church settings', async () => (await route('church')).PUT(new Request('http://localhost/x', { method: 'PUT', body: JSON.stringify({
    name: 'CityChurch', timezone: 'America/New_York', default_language: 'en',
    group_label_singular_en: 'House Church', group_label_plural_en: 'House Churches',
    group_label_singular_es: 'Iglesia en Casa', group_label_plural_es: 'Iglesias en Casa',
    checkins_event_name: '', church_center_url: '' }) }))],
  ['POST discipleship answers', async () => (await route('discipleship/answers')).POST(req('/api/discipleship/answers', { method: 'POST', body: { week: 1, day: 1, answers: { '0-reflect': 'mine' } } }))],
  ['POST incubator answers', async () => (await route('incubator/answers')).POST(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ week: 1, day: 1, module: 0, answers: { '0': 'mine' } }) }))],
];

describe('CityChurch never changes Test Church data', () => {
  it.each(['admin', 'pastorA', 'both'] as const)('every write route with Test Church ids, as %s', async (who) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const before = await testChurchSnapshot();
    as(who);
    for (const [name, call] of WRITES) {
      const res = await call();
      const body = await res.json().catch(() => null);
      expect(leaks(body), `${who} ${name} (${res.status})`).toEqual([]);
    }
    expect(await testChurchSnapshot()).toEqual(before);
  });

  it('the refusals are explicit: not found, forbidden or a bad request', async () => {
    as('admin');
    const status = async (name: string) => (await WRITES.find(([n]) => n === name)![1]()).status;
    expect(await status('PATCH groups T')).toBe(404);
    expect(await status('POST groups with T pastor')).toBe(400);
    expect(await status('POST attendance T group')).toBe(404);
    expect(await status('POST attendance Sunday T member')).toBe(403);
    expect(await status('PATCH meeting T')).toBe(404);
    expect(await status('DELETE prayer T')).toBe(404);
    expect(await status('PATCH role adminT')).toBe(404);
    expect(await status('DELETE user memberT')).toBe(404);
    expect(await status('PUT incubator access memberT')).toBe(404);
    expect(await status('POST note T1')).toBe(404);
  });

  it("removing a user from CityChurch keeps their Test Church account and membership", async () => {
    as('admin');
    const res = await (await route('settings/users')).DELETE(new Request('http://localhost/x', { method: 'DELETE', body: JSON.stringify({ userId: U.both }) }));
    expect(res.status).toBe(200);
    expect(await sql('SELECT church_id::text FROM church_memberships WHERE user_id = $1', [U.both])).toEqual([{ church_id: CHURCH.test }]);
    expect(await sql('SELECT id FROM users WHERE id = $1', [U.both])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The database: no church set, nothing visible and nothing writable
// ---------------------------------------------------------------------------

const MINIMAL_INSERT: Record<(typeof RLS_TABLES)[number], [string, unknown[]]> = {
  groups: [`INSERT INTO groups (church_id, name) VALUES ($1, 'x')`, []],
  members: [`INSERT INTO members (church_id, first_name) VALUES ($1, 'x')`, []],
  attendance: [`INSERT INTO attendance (church_id, date, attendance_type) VALUES ($1, '2026-01-01', 'group')`, []],
  attendance_sessions: [`INSERT INTO attendance_sessions (church_id, date, attendance_type) VALUES ($1, '2026-01-02', 'group')`, []],
  calendar_events: [`INSERT INTO calendar_events (church_id, title_en, category, start_date, end_date) VALUES ($1, 'x', 'brunch', '2026-01-01', '2026-01-01')`, []],
  prayer_requests: [`INSERT INTO prayer_requests (church_id, title) VALUES ($1, 'x')`, []],
  pastoral_meetings: [`INSERT INTO pastoral_meetings (church_id, pastor_id, member_id, topic_key, meeting_date) VALUES ($1, $2, $3, 'general', '2026-01-01')`, [U.admin, M.A1]],
  pastoral_notes: [`INSERT INTO pastoral_notes (church_id, pastor_id, member_id, content) VALUES ($1, $2, $3, 'x')`, [U.admin, M.A1]],
  member_flags: [`INSERT INTO member_flags (church_id, member_id, created_by, flag_color, description) VALUES ($1, $2, $3, 'red', 'x')`, [M.A1, U.admin]],
  directory_visibility: [`INSERT INTO directory_visibility (church_id, scope, scope_id, field, level) VALUES ($1, 'church', $1, 'email', 'church')`, []],
  sync_log: [`INSERT INTO sync_log (church_id, source, success) VALUES ($1, 'manual', true)`, []],
  pco_tokens: [`INSERT INTO pco_tokens (church_id, user_id, access_token, refresh_token, expires_at) VALUES ($1, $2, 'a', 'r', now())`, [U.admin]],
  discipleship_progress: [`INSERT INTO discipleship_progress (church_id, user_id, week, day) VALUES ($1, $2, 7, 7)`, [U.admin]],
  incubator_progress: [`INSERT INTO incubator_progress (church_id, user_id, week, day) VALUES ($1, $2, 5, 9)`, [U.admin]],
  incubator_access: [`INSERT INTO incubator_access (church_id, user_id) VALUES ($1, $2)`, [U.admin]],
};

describe('row-level security in the database', () => {
  /** Runs statements as the app role, with app.church_id set to `churchId` (or nothing). */
  const asApp = async <T>(churchId: string | null, fn: () => Promise<T>): Promise<T> => {
    await current.db!.pg.exec('SAVEPOINT as_app; SET LOCAL ROLE kinly_app');
    if (churchId) await sql("SELECT set_config('app.church_id', $1, true)", [churchId]);
    try {
      return await fn();
    } finally {
      await current.db!.pg.exec('ROLLBACK TO SAVEPOINT as_app; RELEASE SAVEPOINT as_app');
    }
  };

  it.each(RLS_TABLES)('%s: with no church set, reads return no rows and inserts fail', async (table) => {
    expect((await sql(`SELECT count(*)::int AS n FROM ${table}`))[0].n).toBeGreaterThan(table === 'pco_tokens' || table === 'incubator_progress' ? -1 : 0);
    const seen = await asApp(null, () => sql(`SELECT count(*)::int AS n FROM ${table}`));
    expect(seen[0].n).toBe(0);
    const [text, extra] = MINIMAL_INSERT[table];
    await expect(asApp(null, () => sql(text, [CHURCH.city, ...extra]))).rejects.toThrow(/row-level security/);
  });

  it.each(RLS_TABLES)('%s: inside a church, only its rows; writing another church\'s row fails or touches nothing', async (table) => {
    const visible = await asApp(CHURCH.test, () => sql(`SELECT DISTINCT church_id::text FROM ${table}`));
    expect(visible.every((r) => r.church_id === CHURCH.test)).toBe(true);
    const [text, extra] = MINIMAL_INSERT[table];
    await expect(asApp(CHURCH.test, () => sql(text, [CHURCH.city, ...extra]))).rejects.toThrow(/row-level security/);
    const updated = await asApp(CHURCH.test, () => sql(`UPDATE ${table} SET church_id = church_id WHERE church_id = $1 RETURNING 1`, [CHURCH.city]));
    expect(updated).toEqual([]);
    const deleted = await asApp(CHURCH.test, () => sql(`DELETE FROM ${table} WHERE church_id = $1 RETURNING 1`, [CHURCH.city]));
    expect(deleted).toEqual([]);
    // Writing its own church works; moving that row into another church is refused.
    await expect(asApp(CHURCH.test, async () => {
      await sql(text, [CHURCH.test, ...extra]);
      return sql(`UPDATE ${table} SET church_id = $1`, [CHURCH.city]);
    })).rejects.toThrow(/row-level security/);
  });

  it('an empty app.church_id (a reused connection) is the same as none', async () => {
    const seen = await asApp(null, async () => {
      await sql("SELECT set_config('app.church_id', '', true)");
      return sql('SELECT count(*)::int AS n FROM members');
    });
    expect(seen[0].n).toBe(0);
  });

  it('the app code refuses to query outside a church', async () => {
    const { sql: appSql } = await import('@/lib/db');
    expect(() => appSql('SELECT 1')).toThrow(/No church context/);
  });
});

// ---------------------------------------------------------------------------
// One user in two churches; switching; platform admins
// ---------------------------------------------------------------------------

describe('current church', () => {
  const me = async () => (await (await route('me')).GET()).json();
  const memberIds = async () => ((await (await (await route('members')).GET()).json()).members as { id: string }[]).map((m) => m.id);
  const switchTo = async (churchId: string) => {
    const res = await (await route('church/current')).POST(new Request('http://localhost/api/church/current', { method: 'POST', body: JSON.stringify({ churchId }) }));
    // Like a browser, keep the cookie the response sets.
    const set = res.headers.get('set-cookie');
    const value = set?.match(/kinly-church=([^;]+)/)?.[1];
    if (value) cookieJar.set('kinly-church', value);
    return res;
  };

  it('a user in both churches starts in their first active membership and sees only it', async () => {
    as('both');
    expect(await me()).toMatchObject({ churchId: CHURCH.city, role: 'member' });
    const ids = await memberIds();
    expect(ids).toContain(M.bothCity);
    expect(ids).not.toContain(M.bothTest);
    expect(ids.some((id) => [M.T1, M.T2, M.adminT, M.leaderT].includes(id as never))).toBe(false);
  });

  it('switching moves every request to the other church, with that church\'s role', async () => {
    as('both');
    expect((await switchTo(CHURCH.test)).status).toBe(200);
    expect(await me()).toMatchObject({ churchId: CHURCH.test, role: 'admin' });
    expect((await memberIds()).sort()).toEqual([M.adminT, M.leaderT, M.T1, M.T2, M.bothTest].sort());
    const church = await (await (await route('church')).GET()).json();
    expect(church.church).toMatchObject({ slug: 'test-church', timezone: 'America/Los_Angeles' });
    expect((await switchTo(CHURCH.city)).status).toBe(200);
    expect(await me()).toMatchObject({ churchId: CHURCH.city, role: 'member' });
  });

  it("nobody can switch to a church they don't belong to, and a forged cookie is ignored", async () => {
    as('memberA1');
    expect((await switchTo(CHURCH.test)).status).toBe(403);
    cookieJar.set('kinly-church', CHURCH.test);
    expect(await me()).toMatchObject({ churchId: CHURCH.city });
    expect(await memberIds()).not.toContain(M.T1);
  });

  it('a platform admin opens any church as an admin', async () => {
    as('platform');
    expect(await me()).toMatchObject({ churchId: CHURCH.city, role: 'admin', isPlatformAdmin: true });
    expect(await memberIds()).toContain(M.A1);
    expect((await switchTo(CHURCH.test)).status).toBe(200);
    expect(await me()).toMatchObject({ churchId: CHURCH.test, role: 'admin' });
    expect(await memberIds()).toContain(M.T1);
    const res = await (await route('groups')).PATCH(req('/api/groups', { method: 'PATCH', body: { id: GROUP.T, name: 'Group T renamed' } }));
    expect(res.status).toBe(200);
    expect(await sql('SELECT name FROM groups WHERE id = $1', [GROUP.T])).toEqual([{ name: 'Group T renamed' }]);
  });

  it('a user with no church gets no data', async () => {
    await sql(`INSERT INTO users (id, name, email) VALUES ('00000000-0000-0000-0000-0000000000e8', 'Nobody', 'nobody@example.test')`);
    sessionUser = { id: '00000000-0000-0000-0000-0000000000e8' };
    const res = await (await route('members')).GET();
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('no_church');
  });

  it('sign-ups land in the church being signed up to, pending', async () => {
    cookieJar.set('kinly-church', CHURCH.test);
    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(new Request('http://localhost/api/auth/register', {
      method: 'POST', body: JSON.stringify({ name: 'New T', email: 'new.t@example.test', password: 'long-enough-password' }),
    }));
    expect(res.status).toBe(200);
    expect(await sql(`SELECT cm.church_id::text, cm.status, cm.role FROM church_memberships cm JOIN users u ON u.id = cm.user_id WHERE u.email = 'new.t@example.test'`))
      .toEqual([{ church_id: CHURCH.test, status: 'pending', role: 'member' }]);
  });
});

// ---------------------------------------------------------------------------
// The cron: every church in its own context
// ---------------------------------------------------------------------------

describe('cron sync across churches', () => {
  it('syncs CityChurch and skips Test Church (no token) without failing', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    process.env.PCO_APP_ID = 'app-id';
    process.env.PCO_SECRET = 'secret';
    await sql(
      `INSERT INTO pco_tokens (church_id, user_id, access_token, refresh_token, expires_at) VALUES ($1, $2, 'tok', 'ref', now() + interval '1 hour')`,
      [CHURCH.city, U.admin]
    );
    const pco = newFakePco({
      campuses: [{ id: 'c1', name: 'North' }],
      people: [{ id: 'p1', first: 'Synced', last: 'Person', campus: 'c1' }, { id: 'p2', first: 'Other', last: 'Person', campus: 'c1' }],
      households: [{ id: 'h1', name: 'H', people: ['p1'] }],
    });
    vi.stubGlobal('fetch', fakeFetch(pco));
    const before = await testChurchSnapshot();

    const { GET } = await import('@/app/api/cron/pco-sync/route');
    const res = await GET(new Request('http://localhost/api/cron/pco-sync', { headers: { authorization: 'Bearer cron-secret' } }));
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.churches).toEqual([
      expect.objectContaining({ church: 'citychurch', status: 'ok', imported: 2, campuses: 1 }),
      { church: 'test-church', status: 'skipped', reason: 'not_connected' },
    ]);
    expect(await sql(`SELECT first_name FROM members WHERE church_id = $1 AND pco_id IS NOT NULL ORDER BY pco_id`, [CHURCH.city]))
      .toEqual([{ first_name: 'Synced' }, { first_name: 'Other' }]);
    expect(await sql(`SELECT name FROM groups WHERE church_id = $1 AND pco_campus_id = 'c1'`, [CHURCH.city])).toEqual([{ name: 'North' }]);
    const logs = await sql(`SELECT church_id::text, success FROM sync_log WHERE created_at > now() - interval '1 minute' AND detail <> 'T sync' ORDER BY created_at`);
    expect(logs).toEqual([{ church_id: CHURCH.city, success: true }]);
    expect(await testChurchSnapshot()).toEqual(before);
  });

  it('one church failing does not stop the next', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    process.env.PCO_APP_ID = 'app-id';
    process.env.PCO_SECRET = 'secret';
    // Both churches connected; PCO refuses CityChurch's (expired, refresh revoked) token.
    await sql(`INSERT INTO pco_tokens (church_id, user_id, access_token, refresh_token, expires_at) VALUES ($1, $2, 'old', 'revoked', now() - interval '1 hour')`, [CHURCH.city, U.admin]);
    await sql(`INSERT INTO pco_tokens (church_id, user_id, access_token, refresh_token, expires_at) VALUES ($1, $2, 'tok-t', 'ref-t', now() + interval '1 hour')`, [CHURCH.test, U.adminT]);
    const pco = newFakePco({
      campuses: [{ id: 'tc', name: 'T Campus' }],
      people: [{ id: 'tp', first: 'TPerson', last: 'X', campus: 'tc' }],
      households: [{ id: 'th', name: 'T Household', people: ['tp'] }],
    });
    const serve = fakeFetch(pco);
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.includes('/oauth/token')) return new Response('{"error":"invalid_grant"}', { status: 401 });
      return serve(input as never);
    }));

    const { GET } = await import('@/app/api/cron/pco-sync/route');
    const body = await (await GET(new Request('http://localhost/api/cron/pco-sync', { headers: { authorization: 'Bearer cron-secret' } }))).json();
    expect(body.churches[0]).toMatchObject({ church: 'citychurch', status: 'failed', reason: 'invalid_credentials' });
    expect(body.churches[1]).toMatchObject({ church: 'test-church', status: 'ok', imported: 1 });
    expect(await sql(`SELECT church_id::text FROM members WHERE pco_id = 'tp'`)).toEqual([{ church_id: CHURCH.test }]);
  });
});
