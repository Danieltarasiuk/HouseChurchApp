import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { current, setupTestDb, mockedSql, mockedWithTransaction } from './helpers/db';
import { seedChurch, U, HC } from './helpers/fixtures';

vi.mock('@/lib/db', () => ({
  sql: (text: string, params?: unknown[]) => mockedSql(text, params),
  withTransaction: <T>(fn: (q: typeof mockedSql) => Promise<T>) => mockedWithTransaction(fn),
}));
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: U.admin, role: 'admin' } }) }));

import { todayInChurchTz, isoDateInChurchTz, subtractMonthsISO, monthsAgoInChurchTz } from '@/lib/churchTime';

const sql = (text: string, params?: unknown[]) => current.db!.sql(text, params);

setupTestDb({ beforeAll, beforeEach, afterEach }, seedChurch);
afterEach(() => vi.useRealTimers());

/** 22:30 on Sunday 30 Nov in Miami = 03:30 UTC Monday 1 Dec. */
const SUNDAY_EVENING_MIAMI = new Date('2026-12-01T03:30:00Z');

describe('church calendar dates', () => {
  it("today is the church's date, not the UTC date", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SUNDAY_EVENING_MIAMI);
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-12-01'); // what the old code used
    expect(todayInChurchTz()).toBe('2026-11-30');
  });

  it('follows daylight saving time', () => {
    expect(isoDateInChurchTz(new Date('2026-07-01T03:30:00Z'))).toBe('2026-06-30'); // EDT, UTC-4
    expect(isoDateInChurchTz(new Date('2026-07-01T04:30:00Z'))).toBe('2026-07-01');
    expect(isoDateInChurchTz(new Date('2026-01-01T04:30:00Z'))).toBe('2025-12-31'); // EST, UTC-5
  });

  it.each([
    ['2026-11-30', 1, '2026-10-30'],
    ['2026-05-31', 3, '2026-02-28'],
    ['2028-05-31', 3, '2028-02-29'],
    ['2026-03-31', 1, '2026-02-28'],
    ['2026-01-15', 2, '2025-11-15'],
    ['2026-12-31', 4, '2026-08-31'],
  ])('%s minus %i months is %s', (iso, months, expected) => {
    expect(subtractMonthsISO(iso, months)).toBe(expected);
  });

  it('the window start is computed from the church date', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SUNDAY_EVENING_MIAMI);
    expect(monthsAgoInChurchTz(1)).toBe('2026-10-30'); // UTC would give 2026-11-01
  });
});

describe('attendance windows use the church date', () => {
  beforeEach(async () => {
    // Sessions on 30 Oct and 31 Oct: inside a 1-month window from Sunday
    // 30 Nov (church date), outside one from 1 Dec (the UTC date).
    for (const d of ['2026-10-30', '2026-10-31']) {
      await sql(`INSERT INTO attendance_sessions (date, attendance_type, house_church_id) VALUES ($1, 'house_church', $2)`, [d, HC.A]);
    }
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SUNDAY_EVENING_MIAMI);
  });

  it('history', async () => {
    const { GET } = await import('@/app/api/attendance/history/route');
    const res = await GET(new NextRequest(`http://localhost/api/attendance/history?attendance_type=house_church&months=1&house_church_id=${HC.A}`));
    expect((await res.json()).sessions).toEqual(['2026-10-30', '2026-10-31']);
  });

  it('sessions', async () => {
    const { GET } = await import('@/app/api/attendance/sessions/route');
    const res = await GET(new NextRequest(`http://localhost/api/attendance/sessions?attendance_type=house_church&months=1&house_church_id=${HC.A}`));
    expect((await res.json()).sessions.map((s: { date: string }) => s.date)).toEqual(['2026-10-31', '2026-10-30']);
  });
});
