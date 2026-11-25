import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { current, setupTestDb, mockedSql, mockedWithTransaction } from './helpers/db';
import { seedChurch, U, ROLE_OF } from './helpers/fixtures';
import { newFakePco, fakeFetch } from './helpers/fakePco';

vi.mock('@/lib/db', () => ({
  sql: (text: string, params?: unknown[]) => mockedSql(text, params),
  withTransaction: <T>(fn: (q: typeof mockedSql) => Promise<T>) => mockedWithTransaction(fn),
}));

let sessionUser: { id: string; role: string } | null = null;
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionUser ? { user: sessionUser } : null) }));

const sql = (text: string, params?: unknown[]) => current.db!.sql(text, params);
const as = (who: keyof typeof U) => { sessionUser = { id: U[who], role: ROLE_OF[who] }; };

setupTestDb({ beforeAll, beforeEach, afterEach }, seedChurch);
beforeEach(() => {
  process.env.PCO_APP_ID = 'app-id';
  process.env.PCO_SECRET = 'secret';
  sessionUser = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

/** A stored token for the admin, already expired unless `validFor` seconds given. */
const storeToken = (validForSeconds = -60) =>
  sql(
    `INSERT INTO pco_tokens (user_id, access_token, refresh_token, expires_at)
     VALUES ($1, 'old-access', 'old-refresh', NOW() + make_interval(secs => $2))`,
    [U.admin, validForSeconds]
  );
const stored = async () =>
  (await sql(`SELECT access_token, refresh_token, EXTRACT(EPOCH FROM (expires_at - NOW()))::int AS secs_left FROM pco_tokens WHERE user_id = $1`, [U.admin]))[0];

/** fetch mock: the OAuth token endpoint answers with `body`/`status`; people endpoint answers 200. */
function mockPco(body: unknown, status = 200, delayMs = 0) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    if (url.includes('/oauth/token')) {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      return new Response(JSON.stringify(body), { status });
    }
    return new Response(JSON.stringify({ data: [], meta: { total_count: 0 } }), { status: 200 });
  }));
  return { refreshCalls: () => calls.filter((u) => u.includes('/oauth/token')).length };
}

// ---------------------------------------------------------------------------
// A1 token refresh
// ---------------------------------------------------------------------------

describe('getValidPcoToken', () => {
  it('returns a still-valid token without refreshing', async () => {
    await storeToken(3600);
    const pco = mockPco({});
    const { getValidPcoToken } = await import('@/lib/pco');
    expect(await getValidPcoToken(U.admin)).toEqual({ token: 'old-access' });
    expect(pco.refreshCalls()).toBe(0);
  });

  it("uses Planning Center's expires_in instead of a fixed two hours", async () => {
    await storeToken();
    mockPco({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 900 });
    const { getValidPcoToken } = await import('@/lib/pco');
    expect(await getValidPcoToken(U.admin)).toEqual({ token: 'new-access' });
    const row = await stored();
    expect(row).toMatchObject({ access_token: 'new-access', refresh_token: 'new-refresh' });
    expect(row.secs_left).toBeGreaterThan(880);
    expect(row.secs_left).toBeLessThanOrEqual(900);
  });

  it('refreshes a token about to expire (within the skew)', async () => {
    await storeToken(30);
    const pco = mockPco({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 });
    const { getValidPcoToken } = await import('@/lib/pco');
    expect(await getValidPcoToken(U.admin)).toEqual({ token: 'new-access' });
    expect(pco.refreshCalls()).toBe(1);
  });

  it.each([
    ['no refresh_token', { access_token: 'new-access', expires_in: 7200 }],
    ['no access_token', { refresh_token: 'new-refresh', expires_in: 7200 }],
    ['empty tokens', { access_token: '', refresh_token: '' }],
    ['not an object', 'oops'],
  ])('rejects a refresh response with %s and keeps the stored tokens', async (_label, body) => {
    await storeToken();
    mockPco(body);
    const { getValidPcoToken } = await import('@/lib/pco');
    expect(await getValidPcoToken(U.admin)).toEqual({ error: 'bad_refresh_response' });
    expect(await stored()).toMatchObject({ access_token: 'old-access', refresh_token: 'old-refresh' });
    expect(console.error).toHaveBeenCalled();
  });

  it.each([
    [401, 'invalid_credentials'],
    [400, 'invalid_credentials'],
    [403, 'permission_denied'],
    [503, 'pco_unavailable'],
  ])('maps HTTP %i to %s and changes nothing', async (status, reason) => {
    await storeToken();
    mockPco({ error: 'x' }, status);
    const { getValidPcoToken } = await import('@/lib/pco');
    expect(await getValidPcoToken(U.admin)).toEqual({ error: reason });
    expect(await stored()).toMatchObject({ access_token: 'old-access', refresh_token: 'old-refresh' });
  });

  it('runs one refresh for concurrent callers, who all get the new token', async () => {
    await storeToken();
    const pco = mockPco({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 }, 200, 20);
    const { getValidPcoToken } = await import('@/lib/pco');
    const results = await Promise.all([getValidPcoToken(U.admin), getValidPcoToken(U.admin), getValidPcoToken(U.admin)]);
    expect(results).toEqual([{ token: 'new-access' }, { token: 'new-access' }, { token: 'new-access' }]);
    expect(pco.refreshCalls()).toBe(1);
  });

  it('re-checks under the row lock: a token refreshed meanwhile is used, not refreshed again', async () => {
    await storeToken();
    const pco = mockPco({ access_token: 'never', refresh_token: 'never', expires_in: 7200 });
    // Simulate another instance finishing its refresh between our first read
    // and taking the lock: the locked SELECT sees a fresh token.
    const { getValidPcoToken } = await import('@/lib/pco');
    const db = await import('@/lib/db');
    const spy = vi.spyOn(db, 'withTransaction').mockImplementationOnce(async (fn) => {
      await sql(`UPDATE pco_tokens SET access_token = 'other-instance', expires_at = NOW() + interval '1 hour' WHERE user_id = $1`, [U.admin]);
      return mockedWithTransaction(fn as never);
    });
    expect(await getValidPcoToken(U.admin)).toEqual({ token: 'other-instance' });
    expect(pco.refreshCalls()).toBe(0);
    spy.mockRestore();
  });

  it('the initial connect also stores expires_in, and refuses a response without tokens', async () => {
    const { parseTokenResponse } = await import('@/lib/pco');
    expect(parseTokenResponse({ access_token: 'a', refresh_token: 'r', expires_in: '600' })).toEqual({ ok: true, accessToken: 'a', refreshToken: 'r', expiresIn: 600 });
    expect(parseTokenResponse({ access_token: 'a', refresh_token: 'r' })).toMatchObject({ ok: true, expiresIn: 7200 });
    expect(parseTokenResponse({ access_token: 'a' })).toEqual({ ok: false });
  });
});

// ---------------------------------------------------------------------------
// A2 status shows the sync's connection to every admin
// ---------------------------------------------------------------------------

describe('planning-center/status', () => {
  const status = async () => (await import('@/app/api/planning-center/status/route')).GET();

  it("shows the sync's connection, and whose it is, to an admin who never connected", async () => {
    await storeToken(3600); // the "admin" fixture connected
    await sql(`INSERT INTO users (id, name, email, role) VALUES ('00000000-0000-0000-0000-0000000000b1', 'Second Admin', 'admin2@example.test', 'admin')`);
    mockPco({});
    sessionUser = { id: '00000000-0000-0000-0000-0000000000b1', role: 'admin' };
    const data = await (await status()).json();
    expect(data).toEqual({ connected: true, connectedBy: { name: 'admin', email: 'admin@example.test' } });
  });

  it('reports a failed connection with its reason and owner', async () => {
    await storeToken();
    mockPco({ error: 'revoked' }, 401);
    as('admin');
    expect(await (await status()).json()).toMatchObject({ connected: false, reason: 'invalid_credentials', connectedBy: { name: 'admin' } });
  });

  it('reports not connected when nobody has connected', async () => {
    as('admin');
    expect(await (await status()).json()).toEqual({ connected: false });
  });

  it.each(['pastorA', 'memberA1'] as const)('is admin-only (%s → 403)', async (who) => {
    as(who);
    expect((await status()).status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// A4 failures before the sync starts are logged as translatable codes
// ---------------------------------------------------------------------------

describe('pre-sync failures in sync_log', () => {
  it('a cron run with no connection is logged as a coded warning', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    const { GET } = await import('@/app/api/cron/pco-sync/route');
    await GET(new Request('http://localhost/api/cron/pco-sync', { headers: { authorization: 'Bearer cron-secret' } }));
    const [row] = await sql('SELECT success, detail FROM sync_log ORDER BY created_at DESC LIMIT 1');
    const { parseSyncDetail } = await import('@/lib/pco');
    expect(row.success).toBe(false);
    expect(parseSyncDetail(row.detail).warnings).toEqual([{ step: 'connection', code: 'not_connected' }]);
  });

  it('a manual run with a revoked token is logged the same way and answers with a reason code', async () => {
    await storeToken();
    mockPco({ error: 'revoked' }, 401);
    as('admin');
    const { POST } = await import('@/app/api/planning-center/import/route');
    const res = await POST();
    expect((await res.json()).reason).toBe('invalid_credentials');
    const [row] = await sql('SELECT detail FROM sync_log ORDER BY created_at DESC LIMIT 1');
    const { parseSyncDetail } = await import('@/lib/pco');
    expect(parseSyncDetail(row.detail).warnings).toEqual([{ step: 'connection', code: 'invalid_credentials' }]);
  });
});

// ---------------------------------------------------------------------------
// A6 campuses deleted in Planning Center
// ---------------------------------------------------------------------------

describe('deleted campuses', () => {
  const NO_GEOCODE = { geocodeDeadline: 0 }; // 0 is now a passed deadline, not "none"
  const seedPco = () => {
    const pco = newFakePco({
      campuses: [{ id: 'c1', name: 'North' }, { id: 'c2', name: 'South' }],
      people: [{ id: 'p1', first: 'A', last: 'B', campus: 'c1' }],
      households: [{ id: 'h1', name: 'H', people: ['p1'] }],
    });
    vi.stubGlobal('fetch', fakeFetch(pco));
    return pco;
  };
  const activeHcs = async () =>
    (await sql(`SELECT name FROM house_churches WHERE pco_campus_id IS NOT NULL AND is_active ORDER BY name`)).map((r) => r.name);

  it('deactivates their house churches after a complete campuses fetch, and counts them', async () => {
    const pco = seedPco();
    const { runPcoSync } = await import('@/lib/pco');
    await runPcoSync('t', NO_GEOCODE);
    expect(await activeHcs()).toEqual(['North', 'South']);

    pco.campuses = [{ id: 'c1', name: 'North' }];
    const result = await runPcoSync('t', NO_GEOCODE);
    expect(result.houseChurchesDeactivated).toBe(1);
    expect(await activeHcs()).toEqual(['North']);

    pco.campuses.push({ id: 'c2', name: 'South' }); // it comes back
    expect((await runPcoSync('t', NO_GEOCODE)).houseChurchesDeactivated).toBe(0);
    expect(await activeHcs()).toEqual(['North', 'South']);
  });

  it.each(['500', 'truncate', 'empty'] as const)('deactivates nothing when the campuses fetch fails (%s)', async (fault) => {
    const pco = seedPco();
    const { runPcoSync } = await import('@/lib/pco');
    await runPcoSync('t', NO_GEOCODE);
    pco.campuses = [{ id: 'c1', name: 'North' }, { id: 'c3', name: 'West' }];
    pco.pageSize = 1;
    pco.faults.campuses = { page: fault === '500' ? 1 : 0, fault }; // truncate: no next link after page 1
    const result = await runPcoSync('t', NO_GEOCODE);
    expect(result.houseChurchesDeactivated).toBe(0);
    expect(await activeHcs()).toEqual(['North', 'South']);
  });

  it('never touches house churches created in the app (no campus)', async () => {
    seedPco();
    const { runPcoSync } = await import('@/lib/pco');
    await runPcoSync('t', NO_GEOCODE);
    const manual = await sql(`SELECT is_active FROM house_churches WHERE pco_campus_id IS NULL`);
    expect(manual.every((r) => r.is_active)).toBe(true); // HC A / HC B fixtures
  });
});
