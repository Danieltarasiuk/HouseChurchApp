import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { current, setupTestDb, mockedSql, mockedWithTransaction } from './helpers/db';
import { seedChurch, U, ROLE_OF } from './helpers/fixtures';
import { requiredAnswerKeys } from '@/lib/discipleshipProgress';
import { incubatorBodyIndex, incubatorDay } from '@/lib/incubator';
import { INCUBATOR_CURRICULUM } from '@/data/incubator-curriculum';
import { INCUBATOR_BODIES } from '@/data/incubator-bodies';

vi.mock('@/lib/db', () => ({
  sql: (text: string, params?: unknown[]) => mockedSql(text, params),
  withTransaction: <T>(fn: (q: typeof mockedSql) => Promise<T>) => mockedWithTransaction(fn),
}));
let sessionUser: { id: string; role: string } | null = null;
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionUser ? { user: sessionUser } : null) }));

const sql = (text: string, params?: unknown[]) => current.db!.sql(text, params);
const as = (who: keyof typeof U) => { sessionUser = { id: U[who], role: ROLE_OF[who] }; };
const post = (path: string, body: unknown, method = 'POST') =>
  new Request(`http://localhost${path}`, { method, body: JSON.stringify(body) });

setupTestDb({ beforeAll, beforeEach, afterEach }, seedChurch);
beforeEach(() => { sessionUser = null; vi.spyOn(console, 'error').mockImplementation(() => {}); });

// ---------------------------------------------------------------------------
// D1 Discipleship (7&7)
// ---------------------------------------------------------------------------

describe('discipleship progress', () => {
  const save = async (answers: Record<string, string>, week = 1, day = 1) => {
    const { POST } = await import('@/app/api/discipleship/answers/route');
    return POST(new NextRequest('http://localhost/api/discipleship/answers', { method: 'POST', body: JSON.stringify({ week, day, answers }) }));
  };
  const row = async () =>
    (await sql('SELECT answers, completed, completed_at FROM discipleship_progress WHERE user_id = $1 AND week = 1 AND day = 1', [U.memberA1]))[0];
  const all = () => Object.fromEntries(requiredAnswerKeys(1, 1)!.map((k) => [k, `answer ${k}`]));

  beforeEach(() => as('memberA1'));

  it('a partly answered day is saved but not completed', async () => {
    const keys = requiredAnswerKeys(1, 1)!;
    expect((await save({ [keys[0]]: 'something' })).status).toBe(200);
    expect(await row()).toMatchObject({ completed: false, completed_at: null, answers: { [keys[0]]: 'something' } });
  });

  it('records completed and completed_at when every answer is filled in, and keeps the first time', async () => {
    const res = await save(all());
    expect(await res.json()).toMatchObject({ completed: true });
    const first = await row();
    expect(first.completed).toBe(true);
    expect(first.completed_at).toBeInstanceOf(Date);

    await save({ ...all(), [requiredAnswerKeys(1, 1)![0]]: 'edited' });
    expect((await row()).completed_at).toEqual(first.completed_at);
  });

  it('whitespace-only answers do not count', async () => {
    await save({ ...all(), [requiredAnswerKeys(1, 1)![0]]: '   ' });
    expect((await row()).completed).toBe(false);
  });

  it('clearing an answer un-completes the day; clearing all saves an empty day', async () => {
    await save(all());
    const { [requiredAnswerKeys(1, 1)![0]]: _dropped, ...rest } = all(); // eslint-disable-line @typescript-eslint/no-unused-vars
    await save(rest);
    expect(await row()).toMatchObject({ completed: false, completed_at: null });
    await save({});
    expect(await row()).toMatchObject({ answers: {}, completed: false });
  });

  it('GET returns the answers and completion', async () => {
    await save(all());
    const { GET } = await import('@/app/api/discipleship/answers/route');
    const data = await (await GET(new NextRequest('http://localhost/api/discipleship/answers?week=1&day=1'))).json();
    expect(data).toMatchObject({ completed: true, answers: all() });
  });

  it('rejects a week or day that does not exist', async () => {
    expect((await save({}, 99, 1)).status).toBe(400);
    expect((await save({}, 1, 9)).status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// D2 Incubator lesson lookup and saved answers
// ---------------------------------------------------------------------------

describe('incubator lesson text', () => {
  it('maps every module to its own body, in order, all 35', () => {
    const indexes: number[] = [];
    INCUBATOR_CURRICULUM.weeks.forEach((w, wi) => w.days.forEach((d, di) => d.modules.forEach((_, mi) => {
      indexes.push(incubatorBodyIndex(wi, di, mi)!);
    })));
    expect(indexes).toEqual([...Array(35).keys()]);
    expect(INCUBATOR_BODIES).toHaveLength(35);
  });

  it('weeks 4 and 5 get a different text per module on the same day', () => {
    expect(incubatorBodyIndex(3, 0, 0)).toBe(13);
    expect(incubatorBodyIndex(3, 0, 1)).toBe(14); // the old lookup gave 13 for both
    expect(incubatorBodyIndex(4, 5, 2)).toBe(34);
    expect(incubatorBodyIndex(4, 5, 3)).toBeNull();
  });
});

describe('incubator access and answers', () => {
  const day = async (week = 4, d = 1) => (await import('@/app/api/incubator/day/route')).GET(new NextRequest(`http://localhost/api/incubator/day?week=${week}&day=${d}`));
  const answer = async (body: Record<string, unknown>) => (await import('@/app/api/incubator/answers/route')).POST(post('/api/incubator/answers', body));
  const grant = async (userId: string, active: boolean) => (await import('@/app/api/settings/incubator-access/route')).PUT(post('/api/settings/incubator-access', { userId, active }, 'PUT'));

  it('admins can always open it; others need an active grant', async () => {
    as('admin');
    expect((await day()).status).toBe(200);
    as('memberA1');
    expect((await day()).status).toBe(403);
    expect((await answer({ week: 4, day: 1, module: 0, answers: {} })).status).toBe(403);
  });

  it('an admin grants and revokes access in Settings; nobody else can', async () => {
    as('pastorA');
    expect((await grant(U.memberA1, true)).status).toBe(403);
    as('admin');
    expect((await grant(U.memberA1, true)).status).toBe(200);
    as('memberA1');
    expect((await day()).status).toBe(200);
    as('admin');
    await grant(U.memberA1, false);
    as('memberA1');
    expect((await day()).status).toBe(403);
    expect(await sql('SELECT is_active, granted_by FROM incubator_access WHERE user_id = $1', [U.memberA1])).toEqual([{ is_active: false, granted_by: U.admin }]);
  });

  it('serves each module of a multi-module day its own text', async () => {
    as('admin');
    const { modules } = await (await day(4, 1)).json();
    expect(modules).toHaveLength(2);
    expect(modules[0].body).toEqual(INCUBATOR_BODIES[13]);
    expect(modules[1].body).toEqual(INCUBATOR_BODIES[14]);
  });

  it('saves answers to incubator_progress and returns them on reload', async () => {
    as('admin');
    await grant(U.memberA1, true);
    as('memberA1');
    const questions = incubatorDay(4, 1)!.modules[1].selfEval.length;
    const answers = Object.fromEntries([...Array(questions).keys()].map((qi) => [String(qi), `my answer ${qi}`]));
    const res = await answer({ week: 4, day: 1, module: 1, answers });
    expect(await res.json()).toMatchObject({ completed: true });

    const { modules } = await (await day(4, 1)).json();
    expect(modules[0]).toMatchObject({ answers: {}, completed: false });
    expect(modules[1]).toMatchObject({ answers, completed: true });

    await answer({ week: 4, day: 1, module: 1, answers: { '0': 'only one' } });
    expect((await (await day(4, 1)).json()).modules[1]).toMatchObject({ answers: { '0': 'only one' }, completed: false });
  });

  it('rejects a module that does not exist and ignores unknown question keys', async () => {
    as('admin');
    expect((await answer({ week: 1, day: 1, module: 5, answers: {} })).status).toBe(400);
    await answer({ week: 1, day: 1, module: 0, answers: { '0': 'a', '999': 'b', x: 'c' } });
    const [r] = await sql('SELECT answers FROM incubator_progress WHERE user_id = $1', [U.admin]);
    expect(r.answers).toEqual({ '0': 'a' });
  });
});
