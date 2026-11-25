import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { current, setupTestDb } from './helpers/db';
import { seedChurch, U, CHURCH, T_ROW } from './helpers/fixtures';

vi.mock('@/lib/dbDriver', async () => (await import('./helpers/db')).testDriver);
vi.mock('next/headers', async () => (await import('./helpers/db')).headersMock);

let sessionUser: { id: string } | null = null;
vi.mock('@/lib/auth', () => ({ auth: async () => (sessionUser ? { user: sessionUser } : null) }));

// Google is never called for real: record what would be pushed or removed.
const google = vi.hoisted(() => ({
  pushEvent: vi.fn(async () => 'google-new-id'),
  deleteGoogleEvent: vi.fn(async () => {}),
}));
vi.mock('@/lib/googleCalendarSync', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/googleCalendarSync')>()),
  pushEvent: google.pushEvent,
  deleteGoogleEvent: google.deleteGoogleEvent,
}));

/**
 * Two kinds of calendar event (calendar_events.visibility):
 *   leaders  admins and group leaders only, pushed to Google Calendar
 *   members  church events, every active member; not pushed
 * A member can never get a leadership event: not in a range, not by id,
 * not through a write route.
 */

const sql = (text: string, params?: unknown[]) => current.db!.sql(text, params);
const as = (who: keyof typeof U | null) => { sessionUser = who ? { id: U[who] } : null; };
const req = (path: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? 'GET',
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body), headers: { 'content-type': 'application/json' } } : {}),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const list = async () => (await import('@/app/api/calendar-events/route')).GET(req('/api/calendar-events?from=2027-01-01&to=2027-01-31'));
const one = async (id: string) => (await import('@/app/api/calendar-events/[id]/route')).GET(req(`/api/calendar-events/${id}`), params(id));
const create = async (body: unknown) => (await import('@/app/api/calendar-events/route')).POST(req('/api/calendar-events', { method: 'POST', body }));
const patch = async (id: string, body: unknown) =>
  (await import('@/app/api/calendar-events/[id]/route')).PATCH(req(`/api/calendar-events/${id}`, { method: 'PATCH', body }), params(id));

const EV = {
  leaders: '00000000-0000-0000-0000-000000000e01',
  church: '00000000-0000-0000-0000-000000000e02',
  churchCancelled: '00000000-0000-0000-0000-000000000e03',
  missing: '00000000-0000-0000-0000-000000000eff',
};
const LEADERS_TITLE = 'Elders budget meeting';

setupTestDb({ beforeAll, beforeEach, afterEach }, async (db) => {
  await seedChurch(db);
  await db.sql(
    `INSERT INTO calendar_events (id, church_id, title_en, category, start_date, end_date, notes, visibility, google_event_id, sync_status) VALUES
       ($1, $4, '${LEADERS_TITLE}', 'special_event', '2027-01-10', '2027-01-10', 'internal note', 'leaders', 'g-leaders', 'synced'),
       ($2, $4, 'Church picnic', 'special_event', '2027-01-16', '2027-01-16', 'bring chairs', 'members', NULL, 'synced'),
       ($3, $4, 'Winter concert', 'worship_night', '2027-01-23', '2027-01-23', NULL, 'members', NULL, 'synced')`,
    [EV.leaders, EV.church, EV.churchCancelled, CHURCH.city]
  );
  await db.sql(`UPDATE calendar_events SET status = 'cancelled' WHERE id = $1`, [EV.churchCancelled]);
});
beforeEach(() => {
  as(null);
  google.pushEvent.mockClear();
  google.deleteGoogleEvent.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

const titles = async (res: Response) => ((await res.json()).events as { title_en: string }[]).map((e) => e.title_en).sort();

describe('who sees which events', () => {
  it.each(['memberA1', 'memberNoGroup', 'both'] as const)('a member (%s) gets church events only, cancelled ones included', async (who) => {
    as(who);
    const res = await list();
    expect(res.status).toBe(200);
    expect(await titles(res)).toEqual(['Church picnic', 'Winter concert']);
  });

  it('a member never sees a leadership event, or any trace of it, in the range', async () => {
    as('memberA1');
    const text = JSON.stringify(await (await list()).json());
    expect(text).not.toContain(LEADERS_TITLE);
    expect(text).not.toContain(EV.leaders);
  });

  it.each(['admin', 'pastorA', 'pastorNone'] as const)('%s gets both kinds, each with its visibility', async (who) => {
    as(who);
    const events = (await (await list()).json()).events as { title_en: string; visibility: string }[];
    expect(events.map((e) => [e.title_en, e.visibility])).toEqual([
      [LEADERS_TITLE, 'leaders'],
      ['Church picnic', 'members'],
      ['Winter concert', 'members'],
    ]);
  });

  it('only admins get notes and sync state', async () => {
    as('admin');
    expect((await (await one(EV.church)).json()).event).toMatchObject({ notes: 'bring chairs', sync_status: 'synced' });
    for (const who of ['pastorA', 'memberA1'] as const) {
      as(who);
      const event = (await (await one(EV.church)).json()).event;
      expect(event.title_en).toBe('Church picnic');
      for (const field of ['notes', 'sync_status', 'sync_error', 'google_event_id', 'created_by']) expect(event).not.toHaveProperty(field);
    }
  });

  it('signed out is 401; a pending account is 403', async () => {
    expect((await list()).status).toBe(401);
    expect((await one(EV.church)).status).toBe(401);
    await sql(`UPDATE church_memberships SET status = 'pending' WHERE user_id = $1 AND church_id = $2`, [U.memberA1, CHURCH.city]);
    as('memberA1');
    expect((await list()).status).toBe(403);
    expect((await one(EV.church)).status).toBe(403);
  });
});

describe('a member can never fetch a leadership event by id', () => {
  it('gets exactly the 404 of an id that does not exist', async () => {
    as('memberA1');
    const hidden = await one(EV.leaders);
    const missing = await one(EV.missing);
    expect(hidden.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await hidden.json()).toEqual(await missing.json());
  });

  it('leaders and admins get it', async () => {
    for (const who of ['admin', 'pastorA'] as const) {
      as(who);
      const res = await one(EV.leaders);
      expect(res.status).toBe(200);
      expect((await res.json()).event.title_en).toBe(LEADERS_TITLE);
    }
  });

  it('nor through any write route, and nothing changes', async () => {
    const before = await sql(`SELECT * FROM calendar_events WHERE id = $1`, [EV.leaders]);
    as('memberA1');
    const r = (path: string) => import(`@/app/api/calendar-events/${path}`);
    const responses = [
      await patch(EV.leaders, { visibility: 'members' }),
      await (await r('[id]/route')).DELETE(req(`/api/calendar-events/${EV.leaders}`, { method: 'DELETE' }), params(EV.leaders)),
      await (await r('[id]/sync/route')).POST(req(`/api/calendar-events/${EV.leaders}/sync`, { method: 'POST' }), params(EV.leaders)),
      await create({ title_en: 'x', category: 'brunch', start_date: '2027-01-01', end_date: '2027-01-01', visibility: 'members' }),
      await (await r('sync-pending/route')).POST(),
    ];
    for (const res of responses) {
      expect(res.status).toBe(403);
      expect(JSON.stringify(await res.json())).not.toContain(LEADERS_TITLE);
    }
    expect(await sql(`SELECT * FROM calendar_events WHERE id = $1`, [EV.leaders])).toEqual(before);
  });

  it("a group leader can read but not change an event's kind", async () => {
    as('pastorA');
    expect((await patch(EV.leaders, { visibility: 'members' })).status).toBe(403);
    expect((await sql(`SELECT visibility FROM calendar_events WHERE id = $1`, [EV.leaders]))[0].visibility).toBe('leaders');
  });

  it("another church's church event is not found either (RLS)", async () => {
    // Test Church's seeded event is a church event, so only RLS hides it.
    for (const who of ['memberA1', 'admin'] as const) {
      as(who);
      expect((await one(T_ROW.event)).status).toBe(404);
    }
  });
});

describe('admins choose the kind', () => {
  const base = { title_en: 'Baptism Sunday', category: 'special_event', start_date: '2027-01-17', end_date: '2027-01-17' };

  it('a new event is leadership unless asked otherwise, and is pushed to Google', async () => {
    as('admin');
    const res = await create(base);
    expect(res.status).toBe(201);
    const { event } = await res.json();
    expect(event).toMatchObject({ visibility: 'leaders', sync_status: 'synced', google_event_id: 'google-new-id' });
    expect(google.pushEvent).toHaveBeenCalledTimes(1);
  });

  it('a church event is saved as one, visible to members, and not pushed', async () => {
    as('admin');
    const { event } = await (await create({ ...base, visibility: 'members' })).json();
    expect(event).toMatchObject({ visibility: 'members', google_event_id: null, sync_status: 'synced' });
    expect(google.pushEvent).not.toHaveBeenCalled();
    as('memberA1');
    expect((await one(event.id)).status).toBe(200);
  });

  it('an unknown kind is refused', async () => {
    as('admin');
    const res = await create({ ...base, visibility: 'everyone' });
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('invalid_visibility');
    expect((await patch(EV.leaders, { visibility: 'public' })).status).toBe(400);
  });

  it('leadership → church removes it from Google; church → leadership pushes it', async () => {
    as('admin');
    const toChurch = (await (await patch(EV.leaders, { visibility: 'members' })).json()).event;
    expect(google.deleteGoogleEvent).toHaveBeenCalledWith('g-leaders');
    expect(google.pushEvent).not.toHaveBeenCalled();
    expect(toChurch).toMatchObject({ visibility: 'members', google_event_id: null, sync_status: 'synced' });

    const back = (await (await patch(EV.leaders, { visibility: 'leaders' })).json()).event;
    expect(google.pushEvent).toHaveBeenCalledTimes(1);
    expect(back).toMatchObject({ visibility: 'leaders', google_event_id: 'google-new-id', sync_status: 'synced' });
  });

  it('editing other fields keeps the kind', async () => {
    as('admin');
    const { event } = await (await patch(EV.church, { title_en: 'Church picnic (moved)' })).json();
    expect(event.visibility).toBe('members');
    expect(google.pushEvent).not.toHaveBeenCalled();
  });

  it('a failed Google removal is recorded, and the change of kind stands', async () => {
    google.deleteGoogleEvent.mockRejectedValueOnce(new Error('boom'));
    as('admin');
    const { event } = await (await patch(EV.leaders, { visibility: 'members' })).json();
    expect(event).toMatchObject({ visibility: 'members', sync_status: 'error' });
    as('memberA1');
    expect((await one(EV.leaders)).status).toBe(200);
  });
});
