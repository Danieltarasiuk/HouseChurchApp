import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { current, setupTestDb, mockedSql } from './helpers/db';
import { seedChurch, U, M, HC, ROLE_OF } from './helpers/fixtures';

vi.mock('@/lib/db', () => ({ sql: (text: string, params?: unknown[]) => mockedSql(text, params) }));

// The signed-in user for the next request; null = signed out.
let sessionUser: { id: string; role: string } | null = null;
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionUser ? { user: sessionUser } : null) }));

const as = (who: keyof typeof U | null) => {
  sessionUser = who ? { id: U[who], role: ROLE_OF[who] } : null;
};

const req = (path: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? 'GET',
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body), headers: { 'content-type': 'application/json' } } : {}),
  });

const sql = (text: string, params?: unknown[]) => current.db!.sql(text, params);

setupTestDb({ beforeAll, beforeEach, afterEach }, seedChurch);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  as(null);
});

// ---------------------------------------------------------------------------
// Sign-in required
// ---------------------------------------------------------------------------

describe('signed-out requests', () => {
  it.each([
    ['scripture/esv', async () => (await import('@/app/api/scripture/esv/route')).GET(req('/api/scripture/esv?ref=John+3:16'))],
    ['scripture/nbla', async () => (await import('@/app/api/scripture/nbla/route')).GET(req('/api/scripture/nbla?ref=Juan+3:16'))],
    ['members', async () => (await import('@/app/api/members/route')).GET()],
    ['dashboard', async () => (await import('@/app/api/dashboard/route')).GET()],
    ['directory-visibility', async () => (await import('@/app/api/directory-visibility/route')).GET(req('/api/directory-visibility?scope=church'))],
  ])('%s → 401', async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// B1 dashboard prayers follow /api/prayer visibility
// ---------------------------------------------------------------------------

describe('dashboard recent prayers', () => {
  beforeEach(async () => {
    await sql(`INSERT INTO prayer_requests (title, user_id, visibility, house_church_id) VALUES
      ('public one', $1, 'public', $2),
      ('A group only', $1, 'house_church', $2),
      ('A private', $1, 'private', $2),
      ('B group only', $3, 'house_church', $4)`, [U.memberA1, HC.A, U.memberB1, HC.B]);
  });
  const titles = async () => {
    const { GET } = await import('@/app/api/dashboard/route');
    const data = await (await GET()).json();
    return data.recentPrayers.map((p: { title: string }) => p.title).sort();
  };

  it('a member of B sees public and B only', async () => {
    as('memberB1');
    expect(await titles()).toEqual(['B group only', 'public one']);
  });
  it('the author sees their own private request', async () => {
    as('memberA1');
    expect(await titles()).toEqual(['A group only', 'A private', 'public one']);
  });
  it("A's pastor sees A's private request, not B's group", async () => {
    as('pastorA');
    expect(await titles()).toEqual(['A group only', 'A private', 'public one']);
  });
  it('an admin sees everything', async () => {
    as('admin');
    expect(await titles()).toHaveLength(4);
  });
  it('counts only visible active prayers', async () => {
    as('memberNoHc');
    const { GET } = await import('@/app/api/dashboard/route');
    expect((await (await GET()).json()).prayerCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// B3 member directory visibility
// ---------------------------------------------------------------------------

const FIELD_KEYS: Record<string, string[]> = {
  phone: ['phone'],
  email: ['email'],
  address: ['address_street', 'address_city', 'address_state', 'address_zip', 'latitude', 'longitude'],
  birthday: ['birthday'],
  household: ['pco_household_id', 'household_name'],
};

async function directory(): Promise<Record<string, Record<string, unknown>>> {
  const { GET } = await import('@/app/api/members/route');
  const res = await GET();
  expect(res.status).toBe(200);
  const { members } = await res.json();
  return Object.fromEntries(members.map((m: Record<string, unknown>) => [m.id, m]));
}

const setLayer = (scope: string, scopeId: string | null, field: string, level: string) =>
  sql(`INSERT INTO directory_visibility (scope, scope_id, field, level) VALUES ($1, $2, $3, $4)`, [scope, scopeId, field, level]);

const sees = (row: Record<string, unknown>, field: string) => FIELD_KEYS[field].every((k) => k in row);
const seesNone = (row: Record<string, unknown>, field: string) => FIELD_KEYS[field].every((k) => !(k in row));

describe('directory visibility', () => {
  it('names and house church are always visible; with no settings every field is leaders-only', async () => {
    as('memberA1');
    const d = await directory();
    expect(Object.keys(d)).toHaveLength(9);
    for (const id of [M.A2, M.B1, M.N]) {
      expect(d[id]).toMatchObject({ first_name: expect.any(String), house_church_id: expect.anything() === undefined ? null : d[id].house_church_id });
      for (const f of Object.keys(FIELD_KEYS)) expect(seesNone(d[id], f)).toBe(true);
    }
  });

  // Each field at each level, for each kind of viewer.
  const FIELDS = Object.keys(FIELD_KEYS);
  const LEVELS = ['leaders', 'group', 'church'] as const;
  // [viewer, target, visible at leaders, at group, at church]
  const CASES: [keyof typeof U, string, string, boolean, boolean, boolean][] = [
    ['memberA1', M.A2, 'same house church', false, true, true],
    ['memberA1', M.B2, 'other house church', false, false, true],
    ['memberNoHc', M.A2, 'viewer with no house church', false, false, true],
    ['pastorA', M.A2, 'own pastor', true, true, true],
    ['pastorA', M.B2, 'pastor of another house church', false, false, true],
    ['pastorNone', M.A2, 'pastor of no house church', false, false, true],
    ['admin', M.B2, 'admin', true, true, true],
  ];
  for (const field of FIELDS) {
    for (const [li, level] of LEVELS.entries()) {
      it.each(CASES)(`${field} at ${level}: %s viewing %s (%s)`, async (viewer, target, _label, ...expected) => {
        await setLayer('church', null, field, level);
        as(viewer);
        const row = (await directory())[target];
        if (expected[li]) expect(sees(row, field)).toBe(true);
        else expect(seesNone(row, field)).toBe(true);
      });
    }
  }

  it('the tightest of the four layers wins, and no layer loosens another', async () => {
    await setLayer('church', null, 'phone', 'church');
    await setLayer('house_church', HC.A, 'phone', 'group');
    as('memberB1');
    expect(seesNone((await directory())[M.A1], 'phone')).toBe(true); // HC layer tightened to group
    as('memberA1');
    expect(sees((await directory())[M.A2], 'phone')).toBe(true);

    await setLayer('member', M.A2, 'phone', 'leaders');
    expect(seesNone((await directory())[M.A2], 'phone')).toBe(true); // individual tightened further

    // Looser lower layers change nothing:
    await setLayer('church', null, 'email', 'leaders');
    await setLayer('house_church', HC.A, 'email', 'church');
    await setLayer('member', M.A2, 'email', 'church');
    await setLayer('member_self', M.A2, 'email', 'church');
    expect(seesNone((await directory())[M.A2], 'email')).toBe(true);
  });

  it('a member can hide their own field, and still sees it themselves', async () => {
    await setLayer('church', null, 'phone', 'church');
    await setLayer('member_self', M.A1, 'phone', 'leaders');
    as('memberB1');
    expect(seesNone((await directory())[M.A1], 'phone')).toBe(true);
    as('memberA1');
    expect((await directory())[M.A1].phone).toBe('555-0100');
    as('pastorA');
    expect((await directory())[M.A1].phone).toBe('555-0100');
  });

  it('a member always sees all of their own fields, with full date of birth', async () => {
    as('memberB1');
    const me = (await directory())[M.B1];
    for (const f of Object.keys(FIELD_KEYS)) expect(sees(me, f)).toBe(true);
    expect(me.date_of_birth).toBe('1990-03-04');
    expect('attendance_note' in me).toBe(false); // never to members, own row included
  });

  it('the birth year never reaches a member or a pastor of another house church', async () => {
    await setLayer('church', null, 'birthday', 'church');
    for (const viewer of ['memberB1', 'memberNoHc', 'pastorB', 'pastorNone'] as const) { // not memberA1: that is A1 themselves
      as(viewer);
      const row = (await directory())[M.A1];
      expect(row.birthday).toBe('03-04');
      expect('date_of_birth' in row).toBe(false);
      expect(JSON.stringify(row)).not.toContain('1990');
    }
  });

  it('admins and the own pastor get the full date of birth', async () => {
    as('admin');
    expect((await directory())[M.B1].date_of_birth).toBe('1990-03-04');
    as('pastorA');
    expect((await directory())[M.A1].date_of_birth).toBe('1990-03-04');
  });

  it('a member with no house church: group behaves as leaders', async () => {
    await setLayer('church', null, 'phone', 'group');
    for (const viewer of ['memberA1', 'pastorNone', 'pastorA'] as const) {
      as(viewer);
      expect(seesNone((await directory())[M.N], 'phone')).toBe(true);
    }
    as('admin');
    expect(sees((await directory())[M.N], 'phone')).toBe(true);
  });

  it('attendance notes go only to admins and the member’s pastor', async () => {
    await setLayer('church', null, 'phone', 'church');
    as('memberA1');
    expect('attendance_note' in (await directory())[M.A2]).toBe(false);
    as('pastorB');
    expect('attendance_note' in (await directory())[M.A2]).toBe(false);
    as('pastorA');
    expect((await directory())[M.A2].attendance_note).toBe('note about A2');
  });

  it('flags minors without exposing ages', async () => {
    as('memberB1');
    const d = await directory();
    expect(d[M.A2].is_minor).toBe(true);
    expect(d[M.A1].is_minor).toBe(false);
  });

  it('applies to pastoral/members too (own pastor: full data)', async () => {
    as('pastorA');
    const { GET } = await import('@/app/api/pastoral/members/route');
    const { members } = await (await GET(req('/api/pastoral/members'))).json();
    const a1 = members.find((m: { id: string }) => m.id === M.A1);
    expect(a1).toMatchObject({ date_of_birth: '1990-03-04', attendance_note: 'note about A1', email: 'a1@example.test' });
  });
});

describe('directory visibility settings API', () => {
  const put = async (body: Record<string, unknown>) => {
    const { PUT } = await import('@/app/api/directory-visibility/route');
    return PUT(req('/api/directory-visibility', { method: 'PUT', body }));
  };
  const get = async (q: string) => {
    const { GET } = await import('@/app/api/directory-visibility/route');
    return GET(req(`/api/directory-visibility?${q}`));
  };

  it.each([
    ['admin', { scope: 'church', field: 'phone', level: 'church' }, 200],
    ['pastorA', { scope: 'church', field: 'phone', level: 'church' }, 403],
    ['memberA1', { scope: 'church', field: 'phone', level: 'church' }, 403],
    ['pastorA', { scope: 'house_church', id: HC.A, field: 'phone', level: 'group' }, 200],
    ['pastorA', { scope: 'house_church', id: HC.B, field: 'phone', level: 'group' }, 403],
    ['pastorNone', { scope: 'house_church', id: HC.A, field: 'phone', level: 'group' }, 403],
    ['memberA1', { scope: 'house_church', id: HC.A, field: 'phone', level: 'group' }, 403],
    ['admin', { scope: 'house_church', id: HC.B, field: 'phone', level: 'group' }, 200],
    ['pastorA', { scope: 'member', id: M.A1, field: 'phone', level: 'leaders' }, 200],
    ['pastorA', { scope: 'member', id: M.B1, field: 'phone', level: 'leaders' }, 403],
    ['memberA1', { scope: 'member', id: M.A2, field: 'phone', level: 'leaders' }, 403],
    ['admin', { scope: 'member', id: M.B1, field: 'phone', level: 'leaders' }, 200],
    ['memberA1', { scope: 'member_self', field: 'phone', level: 'leaders' }, 200],
    ['admin', { scope: 'church', field: 'phone', level: 'everyone' }, 400],
    ['admin', { scope: 'church', field: 'gender', level: 'church' }, 400],
  ] as [keyof typeof U, Record<string, unknown>, number][])('%s PUT %j → %i', async (who, body, status) => {
    as(who);
    expect((await put(body)).status).toBe(status);
  });

  it("member_self always targets the caller's own member, whatever id is sent", async () => {
    as('memberA1');
    await put({ scope: 'member_self', id: M.B1, field: 'phone', level: 'leaders' });
    const rows = await sql(`SELECT scope_id FROM directory_visibility WHERE scope = 'member_self'`);
    expect(rows.map((r) => r.scope_id)).toEqual([M.A1]);
  });

  it('reports the level in effect, its source, and the ceiling from the layers above', async () => {
    as('admin');
    await put({ scope: 'church', field: 'phone', level: 'church' });
    await put({ scope: 'house_church', id: HC.A, field: 'phone', level: 'group' });
    as('memberA1');
    const res = await get('scope=member_self');
    const { fields } = await res.json();
    expect(fields.phone).toEqual({
      value: null,
      effective: { level: 'group', source: 'house_church' },
      ceiling: { level: 'group', source: 'house_church' },
    });
    expect(fields.email.effective).toEqual({ level: 'leaders', source: 'default' });
  });

  it('clearing a setting (level null) removes the row; the church default stays one row per field', async () => {
    as('admin');
    await put({ scope: 'church', field: 'phone', level: 'church' });
    await put({ scope: 'church', field: 'phone', level: 'group' });
    expect(await sql(`SELECT level FROM directory_visibility`)).toEqual([{ level: 'group' }]);
    await put({ scope: 'church', field: 'phone', level: null });
    expect(await sql(`SELECT * FROM directory_visibility`)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// B4 pastors limited to their own house church
// ---------------------------------------------------------------------------

describe('attendance', () => {
  const post = async (body: Record<string, unknown>) => {
    const { POST } = await import('@/app/api/attendance/route');
    return POST(req('/api/attendance', { method: 'POST', body }));
  };
  const hcAttendance = (hc: string, members: string[]) =>
    post({ date: '2026-11-22', attendance_type: 'house_church', house_church_id: hc, records: members.map((id) => ({ member_id: id, present: true })) });
  const sunday = (members: string[]) =>
    post({ date: '2026-11-22', attendance_type: 'sunday_service', house_church_id: null, records: members.map((id) => ({ member_id: id, present: true })) });

  it.each([
    ['admin', HC.B, [M.B1], 200],
    ['pastorA', HC.A, [M.A1, M.A2], 200],
    ['pastorA', HC.B, [M.B1], 403],
    ['pastorA', HC.A, [M.A1, M.B1], 403], // a B member smuggled into A's session
    ['pastorNone', HC.A, [M.A1], 403],
    ['memberA1', HC.A, [M.A1], 403],
  ] as [keyof typeof U, string, string[], number][])('%s writes house church %s attendance for %j → %i', async (who, hc, members, status) => {
    as(who);
    expect((await hcAttendance(hc, members)).status).toBe(status);
  });

  it('pastors record Sunday service only for their own members', async () => {
    as('pastorA');
    expect((await sunday([M.A1, M.A2])).status).toBe(200);
    expect((await sunday([M.A1, M.B1])).status).toBe(403);
    as('pastorNone');
    expect((await sunday([M.N])).status).toBe(403);
  });

  it('a rejected write changes nothing', async () => {
    as('pastorA');
    await hcAttendance(HC.B, [M.B1]);
    expect(await sql('SELECT * FROM attendance')).toEqual([]);
  });

  describe('reads', () => {
    beforeEach(async () => {
      as('admin');
      await hcAttendance(HC.A, [M.A1]);
      await hcAttendance(HC.B, [M.B1]);
      await sunday([M.A1, M.B1, M.N]);
    });

    it('existing: other house church → 403; Sunday lists only own members', async () => {
      const { GET } = await import('@/app/api/attendance/existing/route');
      as('pastorA');
      expect((await GET(req(`/api/attendance/existing?date=2026-11-22&attendance_type=house_church&house_church_id=${HC.B}`))).status).toBe(403);
      const sun = await (await GET(req('/api/attendance/existing?date=2026-11-22&attendance_type=sunday_service'))).json();
      expect(sun.present_member_ids).toEqual([M.A1]);
      as('pastorNone');
      const none = await (await GET(req('/api/attendance/existing?date=2026-11-22&attendance_type=sunday_service'))).json();
      expect(none.present_member_ids).toEqual([]);
      as('admin');
      const all = await (await GET(req('/api/attendance/existing?date=2026-11-22&attendance_type=sunday_service'))).json();
      expect(all.present_member_ids.sort()).toEqual([M.A1, M.B1, M.N].sort());
    });

    it('history: house church sessions and records only for own house church', async () => {
      const { GET } = await import('@/app/api/attendance/history/route');
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));
      try {
        as('pastorA');
        const h = await (await GET(req('/api/attendance/history?attendance_type=house_church'))).json();
        expect(h.sessions).toEqual(['2026-11-22']);
        expect(h.records).toEqual([{ member_id: M.A1, date: '2026-11-22' }]);
        expect(h.my_house_church_ids).toEqual([HC.A]);
        expect((await GET(req(`/api/attendance/history?attendance_type=house_church&house_church_id=${HC.B}`))).status).toBe(403);
        const sun = await (await GET(req('/api/attendance/history?attendance_type=sunday_service'))).json();
        expect(sun.records.map((r: { member_id: string }) => r.member_id)).toEqual([M.A1]);
        as('pastorNone');
        const none = await (await GET(req('/api/attendance/history?attendance_type=house_church'))).json();
        expect(none.sessions).toEqual([]);
        expect(none.records).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('sessions: only own house church sessions, Sunday counts only own members', async () => {
      const { GET } = await import('@/app/api/attendance/sessions/route');
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-24T12:00:00Z'));
      try {
        as('pastorA');
        const hc = await (await GET(req('/api/attendance/sessions?attendance_type=house_church'))).json();
        expect(hc.sessions.map((s: { house_church_id: string }) => s.house_church_id)).toEqual([HC.A]);
        const sun = await (await GET(req('/api/attendance/sessions?attendance_type=sunday_service'))).json();
        expect(sun.sessions[0].present_count).toBe(1);
        as('admin');
        const all = await (await GET(req('/api/attendance/sessions?attendance_type=sunday_service'))).json();
        expect(all.sessions[0].present_count).toBe(3);
      } finally {
        vi.useRealTimers();
      }
    });

    it('per-member history: another house church’s member → 403', async () => {
      const { GET } = await import('@/app/api/attendance/route');
      as('pastorA');
      expect((await GET(req(`/api/attendance?member_id=${M.B1}`))).status).toBe(403);
      expect((await GET(req(`/api/attendance?member_id=${M.A1}`))).status).toBe(200);
    });

    it('deleting another house church’s session → 403', async () => {
      const { DELETE } = await import('@/app/api/attendance/sessions/route');
      as('pastorA');
      const del = (hc: string | null, type = 'house_church') =>
        DELETE(req('/api/attendance/sessions', { method: 'DELETE', body: { date: '2026-11-22', attendance_type: type, house_church_id: hc } }));
      expect((await del(HC.B)).status).toBe(403);
      expect((await del(null, 'sunday_service')).status).toBe(403);
      expect((await del(HC.A)).status).toBe(200);
    });
  });
});

describe('member attendance notes', () => {
  const patch = async (id: string) => {
    const { PATCH } = await import('@/app/api/members/[id]/note/route');
    return PATCH(req(`/api/members/${id}/note`, { method: 'PATCH', body: { attendance_note: 'bass' } }), { params: Promise.resolve({ id }) });
  };
  it.each([
    ['admin', M.B1, 200],
    ['pastorA', M.A1, 200],
    ['pastorA', M.B1, 403],
    ['pastorNone', M.A1, 403],
    ['memberA1', M.A1, 403],
  ] as [keyof typeof U, string, number][])('%s edits note of %s → %i', async (who, id, status) => {
    as(who);
    expect((await patch(id)).status).toBe(status);
  });
});

describe('pastoral/members', () => {
  const list = async (q = '') => {
    const { GET } = await import('@/app/api/pastoral/members/route');
    return GET(req(`/api/pastoral/members${q}`));
  };
  const ids = async (q = '') => ((await (await list(q)).json()).members as { id: string }[]).map((m) => m.id).sort();

  it('a pastor gets only their own house church', async () => {
    as('pastorA');
    expect(await ids()).toEqual([M.pastorA, M.A1, M.A2].sort());
    expect((await list(`?house_church_id=${HC.B}`)).status).toBe(403);
  });
  it('a pastor with no house church gets an empty list, never everyone', async () => {
    as('pastorNone');
    expect(await ids()).toEqual([]);
  });
  it('admins get everyone, and can filter', async () => {
    as('admin');
    expect(await ids()).toHaveLength(9);
    expect(await ids(`?house_church_id=${HC.B}`)).toEqual([M.pastorB, M.B1, M.B2].sort());
  });
  it('members are refused', async () => {
    as('memberA1');
    expect((await list()).status).toBe(403);
  });
});

describe('prayer requests', () => {
  let aPrayer: string;
  let bPrayer: string;
  beforeEach(async () => {
    [{ id: aPrayer }] = await sql(`INSERT INTO prayer_requests (title, user_id, visibility, house_church_id) VALUES ('a', $1, 'house_church', $2) RETURNING id`, [U.memberA1, HC.A]) as { id: string }[];
    [{ id: bPrayer }] = await sql(`INSERT INTO prayer_requests (title, user_id, visibility, house_church_id) VALUES ('b', $1, 'house_church', $2) RETURNING id`, [U.memberB1, HC.B]) as { id: string }[];
  });

  it.each([
    ['pastorA', 'a', 200],
    ['pastorA', 'b', 403],
    ['pastorNone', 'a', 403],
    ['memberB1', 'a', 403],
    ['memberB1', 'b', 200], // the author
    ['admin', 'b', 200],
  ] as [keyof typeof U, 'a' | 'b', number][])('%s marks prayer %s answered → %i', async (who, which, status) => {
    as(who);
    const { PATCH } = await import('@/app/api/prayer/route');
    const res = await PATCH(new Request('http://localhost/api/prayer', {
      method: 'PATCH', body: JSON.stringify({ id: which === 'a' ? aPrayer : bPrayer, status: 'answered' }),
    }));
    expect(res.status).toBe(status);
  });

  const postFor = async (memberId: string | null) => {
    const { POST } = await import('@/app/api/prayer/route');
    return POST(new Request('http://localhost/api/prayer', {
      method: 'POST',
      body: JSON.stringify({ title: 't', visibility: 'house_church', member_id: memberId, house_church_id: HC.B }),
    }));
  };

  it.each([
    ['admin', M.B1, 200],
    ['pastorA', M.A1, 200],
    ['pastorA', M.B1, 403],
    ['pastorNone', M.A1, 403],
    ['memberA1', M.A2, 403],
    ['memberA1', M.A1, 200], // themselves, explicitly
    ['memberA1', null, 200], // themselves
  ] as [keyof typeof U, string | null, number][])('%s posts on behalf of %s → %i', async (who, memberId, status) => {
    as(who);
    expect((await postFor(memberId)).status).toBe(status);
  });

  it('the house church always comes from the member, never from the request', async () => {
    as('memberA1');
    const { prayer } = await (await postFor(null)).json();
    expect(prayer.house_church_id).toBe(HC.A); // request said HC B
    as('pastorA');
    const { prayer: p2 } = await (await postFor(M.A2)).json();
    expect(p2.house_church_id).toBe(HC.A);
  });

  it('GET follows the same visibility as the dashboard', async () => {
    as('memberB1');
    const { GET } = await import('@/app/api/prayer/route');
    const { prayers } = await (await GET()).json();
    expect(prayers.map((p: { title: string }) => p.title)).toEqual(['b']);
  });
});
