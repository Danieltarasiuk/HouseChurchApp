import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { current, setupTestDb, mockedSql } from './helpers/db';
import { seedChurch, U, M } from './helpers/fixtures';

vi.mock('@/lib/db', () => ({ sql: (text: string, params?: unknown[]) => mockedSql(text, params) }));

let sessionUser: { id: string; role: string } | null = null;
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionUser ? { user: sessionUser } : null) }));

// next/headers cookie store for the OAuth callback.
const cookieJar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    delete: (opts: { name: string } | string) => cookieJar.delete(typeof opts === 'string' ? opts : opts.name),
  }),
}));

const sql = (text: string, params?: unknown[]) => current.db!.sql(text, params);

setupTestDb({ beforeAll, beforeEach, afterEach }, seedChurch);
beforeEach(() => {
  cookieJar.clear();
  sessionUser = { id: U.admin, role: 'admin' };
  process.env.PCO_APP_ID = 'app-id';
  process.env.PCO_SECRET = 'secret';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe('Planning Center OAuth state', () => {
  it('authorize sends a fresh state and keeps it in an httpOnly cookie scoped to the callback', async () => {
    const { GET } = await import('@/app/api/planning-center/authorize/route');
    const res1 = await GET();
    const res2 = await GET();
    const state1 = new URL(res1.headers.get('location')!).searchParams.get('state');
    const state2 = new URL(res2.headers.get('location')!).searchParams.get('state');
    expect(state1).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(state1).not.toBe(state2);

    const cookie = res1.cookies.get('pco_oauth_state')!;
    expect(cookie.value).toBe(state1);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.path).toBe('/api/planning-center/callback');
    expect(cookie.maxAge).toBe(600);
  });

  const callback = async (state: string | null) => {
    const { GET } = await import('@/app/api/planning-center/callback/route');
    const q = new URLSearchParams({ code: 'the-code', ...(state ? { state } : {}) });
    return GET(new Request(`http://localhost:3000/api/planning-center/callback?${q}`));
  };
  const tokenFetch = () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt' }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    return f;
  };

  it.each([
    ['missing state', null, 'good-state'],
    ['wrong state', 'forged-state', 'good-state'],
    ['no cookie (flow not started here)', 'good-state', null],
  ])('rejects %s without exchanging the code', async (_label, returned, stored) => {
    if (stored) cookieJar.set('pco_oauth_state', stored);
    const fetchMock = tokenFetch();
    const res = await callback(returned);
    expect(new URL(res.headers.get('location')!).searchParams.get('pco_error')).toBe('state_mismatch');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await sql('SELECT * FROM pco_tokens')).toEqual([]);
  });

  it('accepts a matching state, stores the token, and clears the single-use cookie', async () => {
    cookieJar.set('pco_oauth_state', 'good-state');
    const fetchMock = tokenFetch();
    const res = await callback('good-state');
    expect(new URL(res.headers.get('location')!).searchParams.get('pco_connected')).toBe('true');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await sql('SELECT user_id, access_token FROM pco_tokens')).toEqual([{ user_id: U.admin, access_token: 'at' }]);
    expect(cookieJar.has('pco_oauth_state')).toBe(false);
  });
});

describe('registration gives the new user a member record', () => {
  const register = async (email: string, name = 'New Person') => {
    const { POST } = await import('@/app/api/auth/register/route');
    return POST(new Request('http://localhost/api/auth/register', {
      method: 'POST', body: JSON.stringify({ name, email, password: 'long-enough-password' }),
    }));
  };

  it('links an existing unlinked member with the same email', async () => {
    await sql(`UPDATE members SET user_id = NULL, email = 'Shared@Example.test' WHERE id = $1`, [M.A2]);
    expect((await register('shared@example.test')).status).toBe(200);
    const [user] = await sql(`SELECT id FROM users WHERE email = 'shared@example.test'`);
    const linked = await sql('SELECT id FROM members WHERE user_id = $1', [user.id]);
    expect(linked).toEqual([{ id: M.A2 }]);
  });

  it('creates a member when no member has that email', async () => {
    expect((await register('brand.new@example.test', 'Brand New')).status).toBe(200);
    const rows = await sql(
      `SELECT m.first_name, m.last_name, m.house_church_id FROM members m
       JOIN users u ON u.id = m.user_id WHERE u.email = 'brand.new@example.test'`
    );
    expect(rows).toEqual([{ first_name: 'Brand', last_name: 'New', house_church_id: null }]);
  });

  it("does not take over a member already linked to someone else", async () => {
    expect((await register('a1@example.test')).status).toBe(200); // A1's email, A1 is linked
    const [user] = await sql(`SELECT id FROM users WHERE email = 'a1@example.test' AND id <> $1`, [U.memberA1]);
    expect(await sql('SELECT id FROM members WHERE user_id = $1', [user.id])).toEqual([]);
    expect((await sql('SELECT user_id FROM members WHERE id = $1', [M.A1]))[0].user_id).toBe(U.memberA1);
  });
});
