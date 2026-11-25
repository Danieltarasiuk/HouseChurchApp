/**
 * A fake Planning Center People API for sync tests. Serves campuses, people
 * and households as paginated JSON:API (meta.total_count, links.next), and
 * can inject a failure on any page of any endpoint.
 */

export interface FakeCampus { id: string; name: string; street?: string; city?: string; state?: string; zip?: string }
export interface FakePerson {
  id: string; first: string; last: string; campus?: string | null;
  email?: string; phone?: string; street?: string; city?: string; state?: string; zip?: string;
  birthdate?: string | null; gender?: 'M' | 'F' | null;
}
export interface FakeHousehold { id: string; name: string; people: string[] }

export type Endpoint = 'campuses' | 'people' | 'households';

/** What to do for a page. Return undefined to serve it normally. */
export type Fault =
  | 'network' | '429' | '500' | 'not_json' | 'no_data' | 'empty' | 'truncate' | 'no_total';

export interface FakePcoState {
  campuses: FakeCampus[];
  people: FakePerson[];
  households: FakeHousehold[];
  pageSize: number;
  /** endpoint -> { page (0-based) -> fault } */
  faults: Partial<Record<Endpoint, { page: number; fault: Fault }>>;
  /** Nominatim behaviour for geocoding tests. */
  geocoder: 'ok' | 'error';
  calls: string[];
}

export function newFakePco(init: Partial<FakePcoState> = {}): FakePcoState {
  return { campuses: [], people: [], households: [], pageSize: 2, faults: {}, geocoder: 'ok', calls: [], ...init };
}

const BASE = 'https://api.planningcenteronline.com/people/v2/';

function campusResource(c: FakeCampus) {
  return { id: c.id, type: 'Campus', attributes: { name: c.name, street: c.street ?? '', city: c.city ?? '', state: c.state ?? '', zip: c.zip ?? '' } };
}

function personResources(p: FakePerson) {
  const data = {
    id: p.id, type: 'Person',
    attributes: { first_name: p.first, last_name: p.last, name: `${p.first} ${p.last}`, status: 'active', gender: p.gender ?? null, birthdate: p.birthdate ?? null },
    relationships: { primary_campus: { data: p.campus ? { id: p.campus, type: 'Campus' } : null } },
  };
  const rel = { person: { data: { id: p.id, type: 'Person' } } };
  const included = [];
  if (p.email) included.push({ id: `e${p.id}`, type: 'Email', attributes: { address: p.email, primary: true }, relationships: rel });
  if (p.phone) included.push({ id: `ph${p.id}`, type: 'PhoneNumber', attributes: { number: p.phone, primary: true }, relationships: rel });
  if (p.street || p.city) {
    included.push({
      id: `a${p.id}`, type: 'Address',
      attributes: { street_line_1: p.street ?? '', street_line_2: '', city: p.city ?? '', state: p.state ?? '', zip: p.zip ?? '', primary: true },
      relationships: rel,
    });
  }
  return { data, included };
}

function householdResource(h: FakeHousehold) {
  return {
    id: h.id, type: 'Household', attributes: { name: h.name },
    relationships: { people: { data: h.people.map((id) => ({ id, type: 'Person' })) } },
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Installs as global fetch (vi.stubGlobal('fetch', fakeFetch(state))). */
export function fakeFetch(state: FakePcoState) {
  return async (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    state.calls.push(url);

    if (url.startsWith('https://nominatim.openstreetmap.org/')) {
      if (state.geocoder === 'error') return json({ error: 'blocked' }, 503);
      return json([{ lat: '25.7', lon: '-80.2' }]);
    }

    const endpoint = (['campuses', 'people', 'households'] as Endpoint[]).find((e) => url.startsWith(BASE + e));
    if (!endpoint) throw new Error(`fakePco: unexpected URL ${url}`);

    const offset = Number(new URL(url).searchParams.get('offset') ?? 0);
    const page = Math.floor(offset / state.pageSize);
    const fault = state.faults[endpoint]?.page === page ? state.faults[endpoint]!.fault : undefined;

    if (fault === 'network') throw new TypeError('fetch failed');
    if (fault === '429') return json({ errors: [{ status: '429' }] }, 429);
    if (fault === '500') return json({ errors: [{ status: '500' }] }, 500);
    if (fault === 'not_json') return new Response('<html>Bad gateway</html>', { status: 200 });
    if (fault === 'no_data') return json({ errors: [] });

    let all: { data: unknown; included?: unknown[] }[];
    if (endpoint === 'campuses') all = state.campuses.map((c) => ({ data: campusResource(c) }));
    else if (endpoint === 'households') all = state.households.map((h) => ({ data: householdResource(h) }));
    else all = state.people.map(personResources);
    if (fault === 'empty') all = [];

    const slice = all.slice(offset, offset + state.pageSize);
    const hasMore = offset + state.pageSize < all.length;
    const next = hasMore && fault !== 'truncate'
      ? `${url.split('&offset=')[0].split('?offset=')[0]}${url.includes('?') ? '&' : '?'}offset=${offset + state.pageSize}`
      : null;

    return json({
      data: slice.map((r) => r.data),
      included: slice.flatMap((r) => r.included ?? []),
      meta: fault === 'no_total' ? {} : { total_count: all.length, count: slice.length },
      links: next ? { next } : {},
    });
  };
}
