import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { current, setupTestDb, mockedSql, mockedWithTransaction } from './helpers/db';
import { seedChurch, U, M, ROLE_OF } from './helpers/fixtures';

vi.mock('@/lib/db', () => ({
  sql: (text: string, params?: unknown[]) => mockedSql(text, params),
  withTransaction: <T>(fn: (q: typeof mockedSql) => Promise<T>) => mockedWithTransaction(fn),
}));

let sessionUser: { id: string; role: string } | null = null;
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionUser ? { user: sessionUser } : null) }));

const sql = (text: string, params?: unknown[]) => current.db!.sql(text, params);
const as = (who: keyof typeof U) => { sessionUser = { id: U[who], role: ROLE_OF[who] }; };
const asUser = (id: string, role = 'member') => { sessionUser = { id, role }; };
const req = (path: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? 'GET',
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body), headers: { 'content-type': 'application/json' } } : {}),
  });

setupTestDb({ beforeAll, beforeEach, afterEach }, seedChurch);
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  sessionUser = null;
});

async function register(email: string, name = 'New Person') {
  const { POST } = await import('@/app/api/auth/register/route');
  return POST(new Request('http://localhost/api/auth/register', {
    method: 'POST', body: JSON.stringify({ name, email, password: 'long-enough-password' }),
  }));
}
const userByEmail = async (email: string) => (await sql('SELECT id, status, role FROM users WHERE email = $1', [email]))[0];

// ---------------------------------------------------------------------------
// 1. Registration never links by email
// ---------------------------------------------------------------------------

describe('email/password registration', () => {
  it('never links to an existing member with the same email, and is pending', async () => {
    // A2 has no account: exactly the member an attacker would want.
    expect((await register('a2@example.test')).status).toBe(200);
    const u = await userByEmail('a2@example.test');
    expect(u.status).toBe('pending');
    expect(u.role).toBe('member');
    expect(await sql('SELECT id FROM members WHERE user_id = $1', [u.id])).toEqual([]);
    expect((await sql('SELECT user_id FROM members WHERE id = $1', [M.A2]))[0].user_id).toBeNull();
  });

  it('creates no member either', async () => {
    const before = (await sql('SELECT COUNT(*)::int AS n FROM members'))[0].n;
    await register('brand.new@example.test');
    expect((await sql('SELECT COUNT(*)::int AS n FROM members'))[0].n).toBe(before);
  });

  it('the database refuses a pending account with any role but member', async () => {
    await register('x@example.test');
    await expect(sql(`UPDATE users SET role = 'admin' WHERE email = 'x@example.test'`)).rejects.toThrow(/users_pending_is_member_check/);
  });
});

// ---------------------------------------------------------------------------
// A pending user gets no member data from any API
// ---------------------------------------------------------------------------

describe('a pending account', () => {
  let pendingId: string;
  beforeEach(async () => {
    await register('a2@example.test');
    pendingId = (await userByEmail('a2@example.test')).id;
    asUser(pendingId);
  });

  const MEMBER_ROUTES: [string, () => Promise<Response>][] = [
    ['GET /api/members', async () => (await import('@/app/api/members/route')).GET()],
    ['GET /api/dashboard', async () => (await import('@/app/api/dashboard/route')).GET()],
    ['GET /api/prayer', async () => (await import('@/app/api/prayer/route')).GET()],
    ['POST /api/prayer', async () => (await import('@/app/api/prayer/route')).POST(new Request('http://localhost/api/prayer', { method: 'POST', body: JSON.stringify({ title: 'x' }) }))],
    ['PATCH /api/prayer', async () => (await import('@/app/api/prayer/route')).PATCH(new Request('http://localhost/api/prayer', { method: 'PATCH', body: JSON.stringify({ id: 'x', status: 'answered' }) }))],
    ['GET /api/house-churches', async () => (await import('@/app/api/house-churches/route')).GET()],
    ['GET /api/directory-visibility', async () => (await import('@/app/api/directory-visibility/route')).GET(req('/api/directory-visibility?scope=member_self'))],
    ['GET /api/discipleship/answers', async () => (await import('@/app/api/discipleship/answers/route')).GET(req('/api/discipleship/answers?week=1&day=1'))],
    ['GET /api/me', async () => (await import('@/app/api/me/route')).GET()],
    ['GET /api/scripture/esv', async () => (await import('@/app/api/scripture/esv/route')).GET(req('/api/scripture/esv?ref=John+1'))],
    ['GET /api/pastoral/members', async () => (await import('@/app/api/pastoral/members/route')).GET(req('/api/pastoral/members'))],
    ['GET /api/attendance/history', async () => (await import('@/app/api/attendance/history/route')).GET(req('/api/attendance/history'))],
  ];

  it.each(MEMBER_ROUTES)('%s → 403', async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toMatch(/555-0100|example\.test|Main St|1990/);
  });

  it('is refused even with a stale session claiming a leader role', async () => {
    asUser(pendingId, 'admin'); // token says admin; the database says pending member
    const res = await (await import('@/app/api/members/route')).GET();
    expect(res.status).toBe(403);
  });

  it('is refused even if (somehow) linked to a member', async () => {
    await sql('UPDATE members SET user_id = $1 WHERE id = $2', [pendingId, M.A2]);
    expect((await (await import('@/app/api/members/route')).GET()).status).toBe(403);
  });

  it('cannot have its role changed until approved', async () => {
    as('admin');
    const { PATCH } = await import('@/app/api/settings/users/route');
    const res = await PATCH(new Request('http://localhost/api/settings/users', { method: 'PATCH', body: JSON.stringify({ userId: pendingId, role: 'admin' }) }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('pending');
  });
});

describe('page redirect (middleware)', () => {
  const authorized = async (status: string | null, path: string) => {
    const { authConfig } = await import('@/lib/auth.config');
    const request = { nextUrl: new URL(`http://localhost${path}`) } as unknown as NextRequest;
    const auth = status ? { user: { status }, expires: '' } : null;
    return authConfig.callbacks!.authorized!({ auth, request } as never);
  };

  it('sends a pending account from any app page to /pending', async () => {
    for (const path of ['/dashboard', '/members', '/prayer', '/settings', '/profile']) {
      const res = (await authorized('pending', path)) as Response;
      expect(res).toBeInstanceOf(Response);
      expect(new URL(res.headers.get('location')!).pathname).toBe('/pending');
    }
  });
  it('lets a pending account see /pending, and active accounts everything', async () => {
    expect(await authorized('pending', '/pending')).toBe(true);
    expect(await authorized('active', '/members')).toBe(true);
  });
  it('still requires sign-in for /pending', async () => {
    expect(await authorized(null, '/pending')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Approve and link
// ---------------------------------------------------------------------------

describe('approve and link', () => {
  let pendingId: string;
  beforeEach(async () => {
    await sql(`UPDATE members SET email = 'shared@example.test' WHERE id = $1`, [M.A2]);
    await register('shared@example.test', 'Shared Person');
    pendingId = (await userByEmail('shared@example.test')).id;
  });
  const approve = async (body: Record<string, unknown>) => {
    const { POST } = await import('@/app/api/settings/users/approve/route');
    return POST(new Request('http://localhost/api/settings/users/approve', { method: 'POST', body: JSON.stringify(body) }));
  };

  it('lists the pending account with the same-email member suggested', async () => {
    as('admin');
    const { GET } = await import('@/app/api/settings/users/route');
    const data = await (await GET()).json();
    const u = data.users.find((x: { id: string }) => x.id === pendingId);
    expect(u).toMatchObject({ status: 'pending', signup_method: 'email', suggested_member_id: M.A2 });
    expect(data.users[0].id).toBe(pendingId); // pending first
    expect(data.linkableMembers.map((m: { id: string }) => m.id)).toContain(M.A2);
  });

  it('links to the chosen member and activates the account', async () => {
    as('admin');
    expect((await approve({ userId: pendingId, memberId: M.A2 })).status).toBe(200);
    expect((await userByEmail('shared@example.test')).status).toBe('active');
    expect((await sql('SELECT user_id FROM members WHERE id = $1', [M.A2]))[0].user_id).toBe(pendingId);

    asUser(pendingId);
    const res = await (await import('@/app/api/members/route')).GET();
    expect(res.status).toBe(200);
    const me = (await res.json()).members.find((m: { id: string }) => m.id === M.A2);
    expect(me.date_of_birth).toBeTruthy(); // their own record, now theirs
  });

  it('creates a new member when asked', async () => {
    as('admin');
    const res = await approve({ userId: pendingId, create: true });
    expect(res.status).toBe(200);
    const { memberId } = await res.json();
    expect(await sql('SELECT first_name, last_name, user_id, house_church_id FROM members WHERE id = $1', [memberId]))
      .toEqual([{ first_name: 'Shared', last_name: 'Person', user_id: pendingId, house_church_id: null }]);
    expect((await sql('SELECT user_id FROM members WHERE id = $1', [M.A2]))[0].user_id).toBeNull();
  });

  it('refuses a member already linked to someone else, and leaves the account pending', async () => {
    as('admin');
    const res = await approve({ userId: pendingId, memberId: M.A1 });
    expect(res.status).toBe(409);
    expect((await userByEmail('shared@example.test')).status).toBe('pending');
    expect((await sql('SELECT user_id FROM members WHERE id = $1', [M.A1]))[0].user_id).toBe(U.memberA1);
  });

  it('refuses an account that is not pending', async () => {
    as('admin');
    expect((await approve({ userId: U.memberB1, memberId: M.A2 })).status).toBe(409);
    expect((await sql('SELECT user_id FROM members WHERE id = $1', [M.A2]))[0].user_id).toBeNull();
  });

  it.each(['pastorA', 'memberA1'] as const)('is admin-only (%s → 403)', async (who) => {
    as(who);
    expect((await approve({ userId: pendingId, memberId: M.A2 })).status).toBe(403);
    expect((await userByEmail('shared@example.test')).status).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// Google sign-in still links (Google verifies the email)
// ---------------------------------------------------------------------------

describe('Google sign-in', () => {
  it('a first sign-in creates an active account linked to the same-email member', async () => {
    await sql(`UPDATE members SET email = 'g@example.test' WHERE id = $1`, [M.A2]);
    const { googleSignIn } = await import('@/lib/memberLink');
    const account = await googleSignIn('G@Example.test', 'Gee User');
    expect(account.status).toBe('active');
    expect((await sql('SELECT user_id FROM members WHERE id = $1', [M.A2]))[0].user_id).toBe(account.id);
  });

  it('creates a member when none has the email', async () => {
    const { googleSignIn } = await import('@/lib/memberLink');
    const account = await googleSignIn('fresh@example.test', 'Fresh Face');
    expect(await sql('SELECT first_name FROM members WHERE user_id = $1', [account.id])).toEqual([{ first_name: 'Fresh' }]);
  });

  it('an existing pending account stays pending and is not linked', async () => {
    await register('a2@example.test');
    const { googleSignIn } = await import('@/lib/memberLink');
    const account = await googleSignIn('a2@example.test', 'A2');
    expect(account.status).toBe('pending');
    expect((await sql('SELECT user_id FROM members WHERE id = $1', [M.A2]))[0].user_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Pastoral meetings and flags: pastors only for their own house church
// ---------------------------------------------------------------------------

describe('pastoral meetings and flags', () => {
  const meetingsGet = async (q = '') => (await import('@/app/api/pastoral/meetings/route')).GET(req(`/api/pastoral/meetings${q}`));
  const meetingsPost = async (memberId: string) => (await import('@/app/api/pastoral/meetings/route'))
    .POST(req('/api/pastoral/meetings', { method: 'POST', body: { member_id: memberId, topic_key: 'general', meeting_date: '2026-11-20' } }));
  const flagsGet = async (memberId: string) => (await import('@/app/api/pastoral/flags/route')).GET(req(`/api/pastoral/flags?member_id=${memberId}`));
  const flagsPost = async (memberId: string, color = 'red') => (await import('@/app/api/pastoral/flags/route'))
    .POST(req('/api/pastoral/flags', { method: 'POST', body: { member_id: memberId, flag_color: color, description: 'd' } }));

  it.each([
    ['admin', M.B1, 200],
    ['pastorA', M.A1, 200],
    ['pastorA', M.B1, 403],
    ['pastorNone', M.A1, 403],
    ['memberA1', M.A1, 403],
  ] as [keyof typeof U, string, number][])('%s on member %s: meetings GET/POST and flags GET/POST → %i', async (who, memberId, status) => {
    as(who);
    expect((await meetingsGet(`?member_id=${memberId}`)).status).toBe(status);
    expect((await meetingsPost(memberId)).status).toBe(status);
    expect((await flagsGet(memberId)).status).toBe(status);
    expect((await flagsPost(memberId)).status).toBe(status);
  });

  it("a rejected write stores nothing", async () => {
    as('pastorA');
    await meetingsPost(M.B1);
    await flagsPost(M.B1);
    expect(await sql('SELECT * FROM pastoral_meetings')).toEqual([]);
    expect(await sql('SELECT * FROM member_flags')).toEqual([]);
  });

  it("a pastor's own meeting list is limited to their own house church", async () => {
    // pastorA logged a meeting with B1 back when B1 was in HC A.
    await sql(`INSERT INTO pastoral_meetings (pastor_id, member_id, topic_key, meeting_date) VALUES ($1, $2, 'general', '2026-01-01'), ($1, $3, 'general', '2026-01-02')`, [U.pastorA, M.B1, M.A1]);
    as('pastorA');
    const { meetings } = await (await meetingsGet()).json();
    expect(meetings.map((m: { member_id: string }) => m.member_id)).toEqual([M.A1]);
  });

  it('red flags are shared with the member’s pastor and admins; yellow stays with its author', async () => {
    as('admin');
    await flagsPost(M.A1, 'red');
    await flagsPost(M.A1, 'yellow');
    as('pastorA');
    const { flags } = await (await flagsGet(M.A1)).json();
    expect(flags.map((f: { flag_color: string }) => f.flag_color)).toEqual(['red']);
  });
});

// ---------------------------------------------------------------------------
// 4. Prayer POST: no database text in errors
// ---------------------------------------------------------------------------

describe('prayer POST errors', () => {
  it('returns a generic error and logs the real one', async () => {
    as('memberA1');
    const err = vi.spyOn(console, 'error');
    // A title longer than VARCHAR(255) makes the INSERT fail in the database.
    const { POST } = await import('@/app/api/prayer/route');
    const res = await POST(new Request('http://localhost/api/prayer', { method: 'POST', body: JSON.stringify({ title: 'x'.repeat(300) }) }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to create prayer request', reason: 'save_failed' });
    expect(err).toHaveBeenCalledWith('Create prayer error:', expect.anything());
  });
});
