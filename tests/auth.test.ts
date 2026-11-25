import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { current, setupTestDb, cookieJar } from './helpers/db';
import { seedChurch, U } from './helpers/fixtures';

vi.mock('@/lib/dbDriver', async () => (await import('./helpers/db')).testDriver);
vi.mock('next/headers', async () => (await import('./helpers/db')).headersMock);

let sessionUser: { id: string; role: string } | null = null;
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionUser ? { user: sessionUser } : null) }));


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

