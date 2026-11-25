import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { current, setupTestDb, mockedSql, mockedWithTransaction } from './helpers/db';
import { newFakePco, fakeFetch, type FakePcoState, type Fault, type FakePerson } from './helpers/fakePco';

vi.mock('@/lib/db', () => ({
  sql: (text: string, params?: unknown[]) => mockedSql(text, params),
  withTransaction: <T>(fn: (q: typeof mockedSql) => Promise<T>) => mockedWithTransaction(fn),
}));

import {
  runPcoSync, encodeSyncDetail, parseSyncDetail,
  ARCHIVE_GUARD_MAX_FRACTION, ARCHIVE_GUARD_MIN_PEOPLE,
} from '@/lib/pco';

/** Skip geocoding (deadline already passed) unless a test is about it. */
const NO_GEOCODE = { geocodeDeadline: 1 }; // epoch ms 1: a deadline already passed

let pco: FakePcoState;

const person = (i: number, extra: Partial<FakePerson> = {}): FakePerson => ({
  id: `p${i}`, first: `First${i}`, last: `Last${i}`, campus: i % 2 ? 'c1' : 'c2',
  email: `p${i}@example.test`, street: `${i} Main St`, city: 'Miami', state: 'FL', zip: '33101', ...extra,
});

function seedPco(peopleCount = 5) {
  pco.campuses = [{ id: 'c1', name: 'North' }, { id: 'c2', name: 'South' }, { id: 'c3', name: 'West' }];
  pco.people = Array.from({ length: peopleCount }, (_, i) => person(i + 1));
  pco.households = [
    { id: 'h1', name: 'Household One', people: ['p1', 'p2'] },
    { id: 'h2', name: 'Household Two', people: ['p3'] },
    { id: 'h3', name: 'Household Three', people: [] },
  ];
}

const members = async () =>
  current.db!.sql(
    `SELECT m.pco_id, m.first_name, m.is_active, m.pco_household_id, m.household_name,
            m.latitude, m.longitude, m.address_street, hc.name AS group_name
     FROM members m LEFT JOIN groups hc ON hc.id = m.group_id
     ORDER BY m.pco_id`
  );
const byId = async (): Promise<Record<string, Record<string, any>>> =>
  Object.fromEntries((await members()).map((m) => [m.pco_id, m]));

setupTestDb({ beforeAll, beforeEach, afterEach });
beforeEach(async () => {
  pco = newFakePco();
  vi.stubGlobal('fetch', fakeFetch(pco));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('good sync', () => {
  it('reads every page of every endpoint and writes members, groups and households', async () => {
    seedPco(5); // page size 2 -> people span 3 pages, campuses 2, households 2

    const result = await runPcoSync('t', NO_GEOCODE);

    expect(result.status).toBe('ok');
    expect(result.warnings).toEqual([]);
    expect(result).toMatchObject({ imported: 5, total: 5, campuses: 3, archived: 0 });
    const m = await byId();
    expect(Object.keys(m)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
    expect(m.p1).toMatchObject({ group_name: 'North', pco_household_id: 'h1', household_name: 'Household One' });
    expect(m.p2).toMatchObject({ group_name: 'South', pco_household_id: 'h1' });
    expect(m.p4).toMatchObject({ pco_household_id: null });
    expect(pco.calls.filter((u) => u.includes('/people?')).length).toBe(3);
  });

  it('clears the household of a person PCO returns in no household', async () => {
    seedPco(3);
    await runPcoSync('t', NO_GEOCODE);
    pco.households = pco.households.map((h) => ({ ...h, people: h.people.filter((p) => p !== 'p1') }));

    await runPcoSync('t', NO_GEOCODE);

    expect((await byId()).p1).toMatchObject({ pco_household_id: null, household_name: null });
  });
});

// Every failure mode the sync must survive, on the page where it bites.
const FAULTS: [string, Fault, number, string][] = [
  ['network error', 'network', 0, 'network_error'],
  ['429 rate limit', '429', 0, 'rate_limited'],
  ['500 on a later page', '500', 1, 'http_error'],
  ['non-JSON body', 'not_json', 0, 'not_json'],
  ['missing data list', 'no_data', 0, 'malformed'],
  ['empty result', 'empty', 0, 'empty'],
  ['pagination ending early', 'truncate', 0, 'incomplete'],
  ['missing total_count', 'no_total', 0, 'malformed'],
];

describe.each(FAULTS)('%s', (_label, fault, page, code) => {
  beforeEach(async () => {
    seedPco(5);
    await runPcoSync('t', NO_GEOCODE); // known-good starting state
    // Then change everything in PCO, so any write would be visible.
    pco.campuses = pco.campuses.map((c) => ({ ...c, name: `${c.name} RENAMED` }));
    pco.people = pco.people.slice(0, 4).map((p) => ({ ...p, first: `${p.first}X`, campus: 'c3' }));
    pco.households = [{ id: 'h9', name: 'Moved', people: ['p1', 'p2', 'p3'] }, { id: 'h8', name: 'Other', people: [] }, { id: 'h7', name: 'Third', people: [] }]; // 2 pages
  });

  it('campuses: leaves groups and every group_id alone', async () => {
    pco.faults.campuses = { page, fault };
    const result = await runPcoSync('t', NO_GEOCODE);

    expect(result.status).toBe('warnings');
    expect(result.warnings).toEqual([expect.objectContaining({ step: 'campuses', code })]);
    const hcs = await current.db!.sql('SELECT name FROM groups ORDER BY name');
    expect(hcs.map((h) => h.name)).toEqual(['North', 'South', 'West']);
    const m = await byId();
    expect(m.p1.group_name).toBe('North'); // PCO now says c3, but campuses were not trusted
    expect(m.p2.group_name).toBe('South');
    expect(m.p1.first_name).toBe('First1X'); // people still synced
  });

  it('people: updates and archives nobody, and the run is failed', async () => {
    pco.faults.people = { page, fault };
    const result = await runPcoSync('t', NO_GEOCODE);

    expect(result.status).toBe('failed');
    expect(result.warnings).toEqual([expect.objectContaining({ step: 'people', code })]);
    expect(result.archived).toBe(0);
    const m = await byId();
    expect(Object.values(m).every((x) => x.is_active)).toBe(true); // p5 vanished from PCO, still active
    expect(m.p1.first_name).toBe('First1');
    expect(m.p1.pco_household_id).toBe('h1');
  });

  it('households: every member keeps their household values', async () => {
    pco.faults.households = { page, fault };
    const result = await runPcoSync('t', NO_GEOCODE);

    expect(result.status).toBe('warnings');
    expect(result.warnings).toEqual([expect.objectContaining({ step: 'households', code })]);
    const m = await byId();
    expect(m.p1).toMatchObject({ pco_household_id: 'h1', household_name: 'Household One', first_name: 'First1X' });
    expect(m.p3).toMatchObject({ pco_household_id: 'h2' });
  });
});

describe('archive guard', () => {
  const sync30ThenKeep = async (keep: number) => {
    pco.campuses = [{ id: 'c1', name: 'North' }];
    pco.households = [{ id: 'h1', name: 'H', people: [] }];
    pco.pageSize = 100;
    pco.people = Array.from({ length: 30 }, (_, i) => person(i + 1, { campus: 'c1' }));
    await runPcoSync('t', NO_GEOCODE);
    pco.people = pco.people.slice(0, keep);
    return runPcoSync('t', NO_GEOCODE);
  };
  const activeCount = async () =>
    (await current.db!.sql('SELECT COUNT(*)::int AS n FROM members WHERE is_active'))[0].n;

  it('uses the documented thresholds', () => {
    expect(ARCHIVE_GUARD_MAX_FRACTION).toBe(0.2);
    expect(ARCHIVE_GUARD_MIN_PEOPLE).toBe(5);
  });

  it('trips when more than 20% and more than 5 would be archived', async () => {
    const result = await sync30ThenKeep(23); // 7 of 30 = 23%
    expect(result.archived).toBe(0);
    expect(result.status).toBe('warnings');
    expect(result.warnings).toEqual([{ step: 'people', code: 'archive_guard', params: { count: 7, active: 30 } }]);
    expect(await activeCount()).toBe(30);
  });

  it('allows exactly 20% (6 of 30)', async () => {
    const result = await sync30ThenKeep(24);
    expect(result.archived).toBe(6);
    expect(result.status).toBe('ok');
    expect(await activeCount()).toBe(24);
  });

  it('allows a small churn even above 20% of a small church', async () => {
    pco.campuses = [{ id: 'c1', name: 'North' }];
    pco.households = [{ id: 'h1', name: 'H', people: [] }];
    pco.people = Array.from({ length: 10 }, (_, i) => person(i + 1));
    await runPcoSync('t', NO_GEOCODE);
    pco.people = pco.people.slice(0, 5); // 5 of 10 = 50%, but not more than 5
    const result = await runPcoSync('t', NO_GEOCODE);
    expect(result.archived).toBe(5);
  });

  it('never archives manually added members', async () => {
    await current.db!.sql(`INSERT INTO members (first_name, last_name, is_active) VALUES ('Manual', 'Person', true)`);
    const result = await sync30ThenKeep(26);
    expect(result.archived).toBe(4);
    const manual = await current.db!.sql(`SELECT is_active FROM members WHERE pco_id IS NULL`);
    expect(manual[0].is_active).toBe(true);
  });
});

describe('coordinates', () => {
  beforeEach(async () => {
    seedPco(3);
    await runPcoSync('t', NO_GEOCODE);
    await current.db!.sql('UPDATE members SET latitude = 1, longitude = 2');
  });

  it('clears latitude/longitude when the address changes', async () => {
    pco.people[0] = { ...pco.people[0], street: '99 New Rd' };
    await runPcoSync('t', NO_GEOCODE);
    const m = await byId();
    expect(m.p1).toMatchObject({ address_street: '99 New Rd', latitude: null, longitude: null });
    expect(m.p2).toMatchObject({ latitude: 1, longitude: 2 });
  });

  it('keeps them when PCO sends a blank address (blank never overwrites)', async () => {
    pco.people[0] = { ...pco.people[0], street: '', city: '', state: '', zip: '' };
    await runPcoSync('t', NO_GEOCODE);
    expect((await byId()).p1).toMatchObject({ address_street: '1 Main St', latitude: 1 });
  });
});

describe('geocoding', () => {
  it('reports geocoder errors as a warning, not a failure', async () => {
    seedPco(1);
    pco.geocoder = 'error';
    const result = await runPcoSync('t', { geocodeDeadline: Date.now() + 10_000 });
    expect(result.status).toBe('warnings');
    expect(result.warnings).toEqual([{ step: 'geocoding', code: 'geocode_errors', params: { count: 1 } }]);
  });
});

describe('sync_log detail', () => {
  it('round-trips warnings, and reads legacy plain-text rows', async () => {
    seedPco(3);
    pco.faults.households = { page: 0, fault: '429' };
    const result = await runPcoSync('t', NO_GEOCODE);
    expect(parseSyncDetail(encodeSyncDetail(result)).warnings).toEqual(result.warnings);

    expect(parseSyncDetail('Imported 92, archived 0, 4 campuses')).toEqual({ summary: 'Imported 92, archived 0, 4 campuses', warnings: [] });
    expect(parseSyncDetail('Imported 1, archived 0, 1 campuses. Households not updated: HTTP 500').warnings)
      .toEqual([{ step: 'households', code: 'unexpected', params: { detail: 'HTTP 500' } }]);
  });
});
