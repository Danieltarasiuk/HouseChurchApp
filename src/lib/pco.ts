import { sql } from '@/lib/db';
import { geocodeMembersWithoutCoords, geocodeHouseChurchesWithoutCoords } from '@/lib/geocode';
import { isoDateInChurchTz } from '@/lib/churchTime';

export type PcoErrorReason =
  | 'not_connected'
  | 'missing_credentials'
  | 'invalid_credentials'
  | 'permission_denied'
  | 'pco_unavailable';

export type PcoTokenResult =
  | { token: string; error?: undefined }
  | { token?: undefined; error: PcoErrorReason };

export const PCO_ERROR_MESSAGES: Record<PcoErrorReason, string> = {
  not_connected: 'Planning Center not connected. Please connect first.',
  missing_credentials: 'Planning Center credentials are not configured on the server (PCO_APP_ID / PCO_SECRET).',
  invalid_credentials: 'Planning Center authorization expired or was revoked. Please reconnect.',
  permission_denied: 'Planning Center denied access. Check the app permissions in PCO.',
  pco_unavailable: 'Planning Center is unavailable. Please try again later.',
};

/**
 * Picks the user whose stored token the scheduled sync should run as.
 * Cron has no session, so it borrows the connected admin's token —
 * preferring an admin when several users have connected.
 */
export async function getPcoSyncUserId(): Promise<string | null> {
  const rows = await sql(
    `SELECT t.user_id
     FROM pco_tokens t
     JOIN users u ON u.id = t.user_id
     ORDER BY (u.role = 'admin') DESC, t.created_at DESC
     LIMIT 1`
  );
  return rows.length > 0 ? rows[0].user_id : null;
}

/**
 * Records a sync attempt. Never throws — a logging failure must not
 * turn an otherwise successful sync into an error.
 */
export async function logSync(
  source: 'cron' | 'manual',
  success: boolean,
  detail: string | null,
  syncedCount: number | null
): Promise<void> {
  try {
    await sql(
      'INSERT INTO sync_log (source, success, detail, synced_count) VALUES ($1, $2, $3, $4)',
      [source, success, detail, syncedCount]
    );
  } catch (err) {
    console.error('Failed to write sync_log row:', err);
  }
}

/**
 * Returns a valid PCO access token for the user, refreshing it if expired.
 * On failure, returns a reason distinguishing missing setup, revoked/expired
 * credentials, and PCO outages.
 */
export async function getValidPcoToken(userId: string): Promise<PcoTokenResult> {
  if (!process.env.PCO_APP_ID || !process.env.PCO_SECRET) {
    return { error: 'missing_credentials' };
  }

  const rows = await sql(
    'SELECT access_token, refresh_token, expires_at FROM pco_tokens WHERE user_id = $1',
    [userId]
  );

  if (rows.length === 0) return { error: 'not_connected' };

  const { access_token, refresh_token, expires_at } = rows[0];

  if (new Date(expires_at) > new Date()) {
    return { token: access_token };
  }

  let res: Response;
  try {
    res = await fetch('https://api.planningcenteronline.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: process.env.PCO_APP_ID,
        client_secret: process.env.PCO_SECRET,
      }),
    });
  } catch {
    return { error: 'pco_unavailable' };
  }

  if (!res.ok) {
    // 400/401 = refresh token expired or revoked (PCO refresh tokens
    // lapse after 90 days without use) — the user must reconnect
    if (res.status === 400 || res.status === 401) {
      return { error: 'invalid_credentials' };
    }
    if (res.status === 403) return { error: 'permission_denied' };
    return { error: 'pco_unavailable' };
  }

  const data = await res.json();

  await sql(
    `UPDATE pco_tokens SET access_token = $1, refresh_token = $2, expires_at = NOW() + INTERVAL '7200 seconds' WHERE user_id = $3`,
    [data.access_token, data.refresh_token, userId]
  );

  return { token: data.access_token };
}

/**
 * Verifies a token actually works by making a minimal PCO People API call.
 */
export async function verifyPcoToken(token: string): Promise<{ ok: true } | { ok: false; error: PcoErrorReason }> {
  let res: Response;
  try {
    res = await fetch('https://api.planningcenteronline.com/people/v2/people?per_page=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, error: 'pco_unavailable' };
  }

  if (res.ok) return { ok: true };
  if (res.status === 401) return { ok: false, error: 'invalid_credentials' };
  if (res.status === 403) return { ok: false, error: 'permission_denied' };
  // 429 means we're rate limited but the credentials themselves work
  if (res.status === 429) return { ok: true };
  return { ok: false, error: 'pco_unavailable' };
}

interface PcoPerson {
  id: string;
  attributes: {
    first_name: string;
    last_name: string;
    name: string;
    status: string;
    gender: string | null;    // "M" or "F" or null
    birthdate: string | null; // "YYYY-MM-DD" or null
  };
  relationships?: {
    primary_campus?: { data: { id: string } | null };
  };
}

interface PcoIncluded {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: {
    person?: { data: { id: string } };
  };
}

interface SyncedPerson {
  pco_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  campus_pco_id: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

interface CampusInfo {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

// ---------------------------------------------------------------------------
// Sync warnings
// ---------------------------------------------------------------------------

/**
 * A sync step that can fail on its own without failing the others. Check-Ins
 * is listed so the warning vocabulary covers it, but it is not part of
 * runPcoSync: the attendance page fetches it on demand.
 */
export type SyncStep = 'campuses' | 'people' | 'households' | 'geocoding' | 'checkins';

export type SyncWarningCode =
  | 'network_error'  // fetch threw (DNS, reset, timeout)       params.detail
  | 'rate_limited'   // HTTP 429
  | 'http_error'     // any other non-2xx                       params.status
  | 'not_json'       // 2xx with a body that isn't JSON
  | 'malformed'      // JSON, but not the expected JSON:API shape  params.detail
  | 'empty'          // a well-formed result with nothing in it
  | 'incomplete'     // fewer records than PCO said exist        params.got, params.expected
  | 'archive_guard'  // archiving would deactivate too many      params.count, params.active
  | 'geocode_errors' // geocoder errors (not "no match")         params.count
  | 'unexpected';    // anything else                           params.detail

export interface SyncWarning {
  step: SyncStep;
  code: SyncWarningCode;
  params?: Record<string, string | number>;
}

/** English one-liner for logs and the sync_log summary. The UI translates codes instead. */
export function describeWarning(w: SyncWarning): string {
  const p = w.params ?? {};
  const why: Record<SyncWarningCode, string> = {
    network_error: `network error (${p.detail ?? 'unknown'})`,
    rate_limited: 'Planning Center rate limit reached (HTTP 429)',
    http_error: `Planning Center returned HTTP ${p.status}`,
    not_json: 'malformed response from Planning Center (not JSON)',
    malformed: `malformed response from Planning Center (${p.detail ?? 'unexpected shape'})`,
    empty: 'Planning Center returned no records',
    incomplete: `incomplete response from Planning Center (got ${p.got} of ${p.expected})`,
    archive_guard: `archiving skipped: it would have deactivated ${p.count} of ${p.active} active synced members`,
    geocode_errors: `${p.count} address lookups failed with a geocoder error`,
    unexpected: `unexpected error (${p.detail ?? 'unknown'})`,
  };
  return `${w.step}: ${why[w.code]}`;
}

// ---------------------------------------------------------------------------
// Paginated JSON:API fetch
// ---------------------------------------------------------------------------

interface JsonApiResource {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: unknown } | undefined>;
}

type PagesResult =
  | { ok: true; data: JsonApiResource[]; included: JsonApiResource[] }
  | { ok: false; code: SyncWarningCode; params?: Record<string, string | number> };

/** Hard stop so a looping `links.next` can never spin forever. */
const MAX_PAGES = 500;

/**
 * Fetches every page of a PCO list endpoint, all or nothing. Never throws.
 *
 * A result is only `ok` when every page arrived as well-formed JSON:API and
 * the record count matches the `meta.total_count` PCO reported on the first
 * page, so pagination that stops early (a missing `links.next`) is caught as
 * `incomplete` rather than trusted as the full list.
 */
async function fetchAllPages(token: string, firstUrl: string): Promise<PagesResult> {
  const data: JsonApiResource[] = [];
  const included: JsonApiResource[] = [];
  let expected: number | null = null;
  let nextUrl: string | null = firstUrl;
  let pages = 0;

  while (nextUrl) {
    if (++pages > MAX_PAGES) return { ok: false, code: 'malformed', params: { detail: 'too many pages' } };

    let res: Response;
    try {
      res = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      return { ok: false, code: 'network_error', params: { detail: e instanceof Error ? e.message : String(e) } };
    }
    if (res.status === 429) return { ok: false, code: 'rate_limited' };
    if (!res.ok) return { ok: false, code: 'http_error', params: { status: res.status } };

    let body;
    try {
      body = await res.json();
    } catch {
      return { ok: false, code: 'not_json' };
    }
    if (!body || !Array.isArray(body.data)) {
      return { ok: false, code: 'malformed', params: { detail: 'no data list' } };
    }
    if (body.included !== undefined && !Array.isArray(body.included)) {
      return { ok: false, code: 'malformed', params: { detail: 'included is not a list' } };
    }
    if (expected === null) {
      const total = body.meta?.total_count;
      if (typeof total !== 'number') {
        return { ok: false, code: 'malformed', params: { detail: 'no total_count' } };
      }
      expected = total;
    }

    data.push(...body.data);
    if (body.included) included.push(...body.included);
    nextUrl = typeof body.links?.next === 'string' ? body.links.next : null;
  }

  if (data.length === 0) return { ok: false, code: 'empty' };
  if (expected !== null && data.length < expected) {
    return { ok: false, code: 'incomplete', params: { got: data.length, expected } };
  }
  return { ok: true, data, included };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

type StepResult<T> = { ok: true; value: T } | { ok: false; warning: SyncWarning };

const stepFail = <T>(step: SyncStep, r: Extract<PagesResult, { ok: false }>): StepResult<T> => {
  const warning: SyncWarning = { step, code: r.code, params: r.params };
  console.error(`PCO sync: ${describeWarning(warning)}`);
  return { ok: false, warning };
};

// ---------------------------------------------------------------------------
// Campuses
// ---------------------------------------------------------------------------

export async function fetchCampuses(token: string): Promise<StepResult<Map<string, CampusInfo>>> {
  const r = await fetchAllPages(token, 'https://api.planningcenteronline.com/people/v2/campuses?per_page=100');
  if (!r.ok) return stepFail('campuses', r);

  const campusMap = new Map<string, CampusInfo>(); // pco_id -> campus info
  for (const campus of r.data) {
    const name = str(campus.attributes?.name);
    if (!campus.id || !isObject(campus.attributes) || !name) {
      return stepFail('campuses', { ok: false, code: 'malformed', params: { detail: 'campus without id or name' } });
    }
    const a = campus.attributes;
    campusMap.set(campus.id, { name, street: str(a.street), city: str(a.city), state: str(a.state), zip: str(a.zip) });
  }
  return { ok: true, value: campusMap };
}

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

interface HouseholdInfo {
  householdId: string;
  householdName: string;
}

/**
 * Maps each PCO person ID to their household. A person in several households
 * keeps the first one seen. All or nothing: on any failure the sync leaves
 * every member's household values exactly as they were. Only a complete,
 * well-formed fetch is trusted to clear a member's household.
 */
export async function fetchHouseholds(token: string): Promise<StepResult<Map<string, HouseholdInfo>>> {
  const r = await fetchAllPages(token, 'https://api.planningcenteronline.com/people/v2/households?per_page=100&include=people');
  if (!r.ok) return stepFail('households', r);

  const householdMap = new Map<string, HouseholdInfo>();
  for (const household of r.data) {
    const people = household.relationships?.people?.data;
    if (!household.id || !Array.isArray(people)) {
      return stepFail('households', { ok: false, code: 'malformed', params: { detail: 'household without a people list' } });
    }
    const name = str(household.attributes?.name);
    for (const p of people) {
      const id = isObject(p) ? str(p.id) : '';
      if (id && !householdMap.has(id)) householdMap.set(id, { householdId: household.id, householdName: name });
    }
  }
  return { ok: true, value: householdMap };
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function fetchAllPeople(
  token: string
): Promise<StepResult<{ active: SyncedPerson[]; skippedInactive: number }>> {
  // Active profiles only; meta.total_count is the filtered count.
  const r = await fetchAllPages(
    token,
    'https://api.planningcenteronline.com/people/v2/people?per_page=100&include=emails,phone_numbers,addresses&where[status]=active'
  );
  if (!r.ok) return stepFail('people', r);

  // Lookup maps from included resources
  const emailMap = new Map<string, string>();
  const phoneMap = new Map<string, string>();
  const addressMap = new Map<string, { street: string; city: string; state: string; zip: string }>();

  for (const inc of r.included as PcoIncluded[]) {
    const personId = inc.relationships?.person?.data?.id;
    if (!personId || !isObject(inc.attributes)) continue;

    if (inc.type === 'Email' && inc.attributes.primary) {
      emailMap.set(personId, str(inc.attributes.address));
    }
    if (inc.type === 'PhoneNumber' && inc.attributes.primary) {
      phoneMap.set(personId, str(inc.attributes.number));
    }
    if (inc.type === 'Address' && inc.attributes.primary) {
      const line1 = str(inc.attributes.street_line_1);
      const line2 = str(inc.attributes.street_line_2);
      addressMap.set(personId, {
        street: line2 ? `${line1}, ${line2}` : line1,
        city: str(inc.attributes.city),
        state: str(inc.attributes.state),
        zip: str(inc.attributes.zip),
      });
    }
  }

  const active: SyncedPerson[] = [];
  let skippedInactive = 0;

  for (const raw of r.data) {
    if (!raw.id || !isObject(raw.attributes)) {
      return stepFail('people', { ok: false, code: 'malformed', params: { detail: 'person without id or attributes' } });
    }
    const person = raw as unknown as PcoPerson;
    // Secondary check: skip any non-active person that slipped through
    if (person.attributes.status && person.attributes.status !== 'active') {
      skippedInactive++;
      continue;
    }

    const addr = addressMap.get(person.id);
    const rawGender = person.attributes.gender; // PCO "M"/"F" -> "Male"/"Female"

    active.push({
      pco_id: person.id,
      first_name: person.attributes.first_name,
      last_name: person.attributes.last_name,
      email: (emailMap.get(person.id) || '').toLowerCase(),
      phone: phoneMap.get(person.id) || '',
      campus_pco_id: person.relationships?.primary_campus?.data?.id || null,
      gender: rawGender === 'M' ? 'Male' : rawGender === 'F' ? 'Female' : null,
      date_of_birth: person.attributes.birthdate || null,
      address_street: addr?.street || '',
      address_city: addr?.city || '',
      address_state: addr?.state || '',
      address_zip: addr?.zip || '',
    });
  }

  return { ok: true, value: { active, skippedInactive } };
}

// ---------------------------------------------------------------------------
// Full sync
// ---------------------------------------------------------------------------

/**
 * Archive guard: refuse to archive when a sync would deactivate more than
 * this fraction of currently active PCO-synced members...
 */
export const ARCHIVE_GUARD_MAX_FRACTION = 0.2;
/** ...and more than this many people (so small, normal churn always goes through). */
export const ARCHIVE_GUARD_MIN_PEOPLE = 5;

export type SyncStatus = 'ok' | 'warnings' | 'failed';

export interface PcoSyncResult {
  /** 'failed' when the people step failed; 'warnings' when any other step did. */
  status: SyncStatus;
  warnings: SyncWarning[];
  imported: number;
  skipped: number;
  archived: number;
  geocoded: number;
  hcGeocoded: number;
  total: number;
  campuses: number;
}

/** English summary line for logs. */
export function describeSyncResult(result: PcoSyncResult): string {
  const base = result.status === 'failed'
    ? 'Sync failed'
    : `Imported ${result.imported}, archived ${result.archived}, ${result.campuses} campuses`;
  return result.warnings.length
    ? `${base}. ${result.warnings.map(describeWarning).join('; ')}`
    : base;
}

/**
 * sync_log.detail payload. JSON in the existing text column, so recording
 * per-step warnings needs no schema change; rows written before this format
 * are plain text and are read by parseSyncDetail's legacy branch.
 */
interface SyncDetailV1 {
  v: 1;
  summary: string;
  warnings: SyncWarning[];
}

export function encodeSyncDetail(result: PcoSyncResult): string {
  const payload: SyncDetailV1 = { v: 1, summary: describeSyncResult(result), warnings: result.warnings };
  return JSON.stringify(payload);
}

/** Inverse of encodeSyncDetail, tolerant of legacy plain-text rows. */
export function parseSyncDetail(detail: string | null): { summary: string; warnings: SyncWarning[] } {
  if (!detail) return { summary: '', warnings: [] };
  if (detail.startsWith('{')) {
    try {
      const parsed = JSON.parse(detail) as Partial<SyncDetailV1>;
      if (parsed.v === 1 && Array.isArray(parsed.warnings)) {
        return { summary: String(parsed.summary ?? ''), warnings: parsed.warnings };
      }
    } catch { /* fall through to legacy */ }
  }
  // Legacy rows: "Imported N, ... . Households not updated: <reason>"
  const marker = 'Households not updated: ';
  const i = detail.indexOf(marker);
  return i >= 0
    ? { summary: detail.slice(0, i).replace(/\.\s*$/, ''), warnings: [{ step: 'households', code: 'unexpected', params: { detail: detail.slice(i + marker.length) } }] }
    : { summary: detail, warnings: [] };
}

export interface PcoSyncOptions {
  /**
   * Epoch ms after which the geocoding step stops. Member and campus syncing
   * always runs to completion; only geocoding is trimmed, and rows left
   * without coordinates are picked up by the next sync.
   */
  geocodeDeadline?: number;
}

/**
 * Full Planning Center sync: campuses → house_churches, active people →
 * members (with households), deactivation of people no longer active in PCO,
 * then geocoding. Shared by the manual "Sync Members" route and the weekly cron.
 *
 * Every step is independent and all or nothing. A step whose PCO data is
 * failed, malformed or incomplete changes nothing it owns and adds a warning:
 *   campuses   → house churches untouched, members keep their house_church_id
 *   households → members keep their household values
 *   people     → no member is updated or archived; the run is 'failed'
 *   archive    → skipped (warning on the people step) if the guard trips
 * Never throws for PCO problems; database errors still propagate.
 */
export async function runPcoSync(token: string, opts: PcoSyncOptions = {}): Promise<PcoSyncResult> {
  const warnings: SyncWarning[] = [];

  // 1. Fetch from PCO. None of these throw.
  const [campusesRes, peopleRes, householdsRes] = await Promise.all([
    fetchCampuses(token),
    fetchAllPeople(token),
    fetchHouseholds(token),
  ]);

  // 2. Campuses → house_churches
  const campusToHcId = new Map<string, string>();
  if (campusesRes.ok) {
    for (const [pcoId, campusInfo] of campusesRes.value) {
      const existing = await sql('SELECT id FROM house_churches WHERE pco_campus_id = $1', [pcoId]);

      if (existing.length > 0) {
        campusToHcId.set(pcoId, existing[0].id);
        // Update name and address in case they changed
        await sql(
          `UPDATE house_churches SET name = $1, campus_name = $1, is_active = true,
           address_street = COALESCE(NULLIF($3, ''), address_street),
           address_city = COALESCE(NULLIF($4, ''), address_city),
           address_state = COALESCE(NULLIF($5, ''), address_state),
           address_zip = COALESCE(NULLIF($6, ''), address_zip)
           WHERE pco_campus_id = $2`,
          [campusInfo.name, pcoId, campusInfo.street, campusInfo.city, campusInfo.state, campusInfo.zip]
        );
      } else {
        const result = await sql(
          `INSERT INTO house_churches (name, pco_campus_id, campus_name,
           address_street, address_city, address_state, address_zip, is_active)
           VALUES ($1, $2, $1, $3, $4, $5, $6, true) RETURNING id`,
          [campusInfo.name, pcoId, campusInfo.street || null, campusInfo.city || null, campusInfo.state || null, campusInfo.zip || null]
        );
        campusToHcId.set(pcoId, result[0].id);
      }
    }
  } else {
    warnings.push(campusesRes.warning);
  }
  if (!householdsRes.ok) warnings.push(householdsRes.warning);

  let imported = 0;
  let archived = 0;
  let skipped = 0;
  let total = 0;

  if (!peopleRes.ok) {
    // 3a. People failed: touch no member at all.
    warnings.push(peopleRes.warning);
  } else {
    const { active: people, skippedInactive } = peopleRes.value;
    skipped = skippedInactive;
    total = people.length;
    const syncedPcoIds = people.map((p) => p.pco_id);

    // Measure the archive before writing anything, against the members who
    // are active right now.
    const [counts] = await sql(
      `SELECT COUNT(*)::int AS active,
              COUNT(*) FILTER (WHERE NOT (pco_id = ANY($1::text[])))::int AS to_archive
       FROM members WHERE pco_id IS NOT NULL AND is_active = true`,
      [syncedPcoIds]
    );
    const activeSynced: number = counts?.active ?? 0;
    const toArchive: number = counts?.to_archive ?? 0;
    const archiveBlocked =
      toArchive > ARCHIVE_GUARD_MIN_PEOPLE && toArchive > activeSynced * ARCHIVE_GUARD_MAX_FRACTION;

    // 3b. People → members
    for (const person of people) {
      const hcId = person.campus_pco_id ? (campusToHcId.get(person.campus_pco_id) || null) : null;
      const household = householdsRes.ok ? householdsRes.value.get(person.pco_id) : undefined;

      // $16: households fetched fine → overwrite (a person in no household is
      //      cleared); otherwise keep the member's existing values.
      // $17: same for house_church_id against the campuses step.
      // Address: blank PCO values never overwrite. When the resulting address
      //      differs from the stored one, clear the coordinates so the
      //      geocoding step looks the new address up.
      const result = await sql(
        `INSERT INTO members (first_name, last_name, email, phone, house_church_id,
                              gender, date_of_birth,
                              address_street, address_city, address_state, address_zip,
                              pco_id, campus_pco_id, pco_household_id, household_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
         ON CONFLICT (pco_id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           email = COALESCE(NULLIF(EXCLUDED.email, ''), members.email),
           phone = COALESCE(NULLIF(EXCLUDED.phone, ''), members.phone),
           house_church_id = CASE WHEN $17 THEN EXCLUDED.house_church_id ELSE members.house_church_id END,
           gender = COALESCE(EXCLUDED.gender, members.gender),
           date_of_birth = COALESCE(EXCLUDED.date_of_birth, members.date_of_birth),
           address_street = COALESCE(NULLIF(EXCLUDED.address_street, ''), members.address_street),
           address_city = COALESCE(NULLIF(EXCLUDED.address_city, ''), members.address_city),
           address_state = COALESCE(NULLIF(EXCLUDED.address_state, ''), members.address_state),
           address_zip = COALESCE(NULLIF(EXCLUDED.address_zip, ''), members.address_zip),
           latitude = CASE WHEN ${ADDRESS_CHANGED} THEN NULL ELSE members.latitude END,
           longitude = CASE WHEN ${ADDRESS_CHANGED} THEN NULL ELSE members.longitude END,
           campus_pco_id = EXCLUDED.campus_pco_id,
           pco_household_id = CASE WHEN $16 THEN EXCLUDED.pco_household_id ELSE members.pco_household_id END,
           household_name = CASE WHEN $16 THEN EXCLUDED.household_name ELSE members.household_name END,
           is_active = true
         RETURNING id`,
        [
          person.first_name, person.last_name, person.email || null,
          person.phone || null, hcId,
          person.gender || null, person.date_of_birth || null,
          person.address_street || null, person.address_city || null,
          person.address_state || null, person.address_zip || null,
          person.pco_id, person.campus_pco_id || null,
          household?.householdId ?? null, household?.householdName || null,
          householdsRes.ok,
          campusesRes.ok,
        ]
      );

      if (result.length > 0) imported++;
    }

    // 3c. Deactivate PCO-synced members no longer active in PCO. Manually
    //     added members (pco_id IS NULL) are never touched.
    if (archiveBlocked) {
      warnings.push({ step: 'people', code: 'archive_guard', params: { count: toArchive, active: activeSynced } });
      console.error(`PCO sync: ${describeWarning(warnings[warnings.length - 1])}`);
    } else if (toArchive > 0) {
      const archivedResult = await sql(
        `UPDATE members SET is_active = false
         WHERE pco_id IS NOT NULL AND is_active = true AND NOT (pco_id = ANY($1::text[]))
         RETURNING id`,
        [syncedPcoIds]
      );
      archived = archivedResult.length;
    }
  }

  // 4. Geocode house churches, then members (the slow step: Nominatim allows
  //    1 req/sec, so it runs last against a deadline; leftovers roll over).
  let hcGeocoded = 0;
  let geocoded = 0;
  let geocodeErrors = 0;
  try {
    const hc = await geocodeHouseChurchesWithoutCoords({ deadline: opts.geocodeDeadline });
    hcGeocoded = hc.geocoded;
    geocodeErrors += hc.errors;
    const m = await geocodeMembersWithoutCoords({ deadline: opts.geocodeDeadline });
    geocoded = m.geocoded;
    geocodeErrors += m.errors;
    if (geocodeErrors > 0) warnings.push({ step: 'geocoding', code: 'geocode_errors', params: { count: geocodeErrors } });
  } catch (e) {
    console.error('Geocoding batch error (non-fatal):', e);
    warnings.push({ step: 'geocoding', code: 'unexpected', params: { detail: e instanceof Error ? e.message : String(e) } });
  }

  return {
    status: !peopleRes.ok ? 'failed' : warnings.length ? 'warnings' : 'ok',
    warnings,
    imported,
    skipped,
    archived,
    geocoded,
    hcGeocoded,
    total,
    campuses: campusesRes.ok ? campusesRes.value.size : 0,
  };
}

/** True when the upsert's resulting address differs from the stored one. */
const ADDRESS_CHANGED = ['street', 'city', 'state', 'zip']
  .map((f) => `COALESCE(NULLIF(EXCLUDED.address_${f}, ''), members.address_${f}) IS DISTINCT FROM members.address_${f}`)
  .join(' OR ');

// ---------------------------------------------------------------------------
// PCO Check-Ins (kids' Sunday attendance)
// ---------------------------------------------------------------------------

/** Name of the PCO Check-Ins event that represents the Sunday service. */
export const SUNDAY_CHECKIN_EVENT_NAME = 'Reunión Dominical Español';

/** Thrown when Check-Ins is unreachable; `status` is the PCO HTTP status. */
export class PcoCheckInsError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const normalizeName = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const localDate = (iso: string) => isoDateInChurchTz(new Date(iso)); // YYYY-MM-DD, church local

async function pcoGet(token: string, url: string) {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new PcoCheckInsError('Planning Center is unavailable.', 502);
  }
  if (!res.ok) throw new PcoCheckInsError(`PCO Check-Ins error: ${res.status}`, res.status);
  return res.json();
}

/**
 * PCO person IDs checked in to the Sunday service event on a calendar day
 * (church local time), plus who performed each check-in (the parent or
 * volunteer, from Check-Ins' checked_in_by). Checked-out people still
 * count — they attended.
 */
export async function fetchSundayCheckedInPersonIds(
  token: string,
  date: string
): Promise<{ eventName: string; personIds: Set<string>; checkerByPerson: Map<string, string> }> {
  const events = await pcoGet(token, 'https://api.planningcenteronline.com/check-ins/v2/events?per_page=100');
  const wanted = normalizeName(SUNDAY_CHECKIN_EVENT_NAME);
  const event = (events.data || []).find(
    (e: { attributes: { name: string } }) => normalizeName(e.attributes.name || '') === wanted
  );
  if (!event) throw new PcoCheckInsError(`Check-Ins event "${SUNDAY_CHECKIN_EVENT_NAME}" not found.`, 404);

  const personIds = new Set<string>();
  const checkerByPerson = new Map<string, string>();
  // Newest first, so stop as soon as a page reaches days before the target.
  let nextUrl: string | null =
    `https://api.planningcenteronline.com/check-ins/v2/events/${event.id}/check_ins?per_page=100&order=-created_at&include=checked_in_by`;
  let pages = 0;

  while (nextUrl && pages < 20) {
    const data = await pcoGet(token, nextUrl);
    pages++;
    let reachedOlder = false;

    for (const ci of data.data || []) {
      const day = localDate(ci.attributes.created_at);
      if (day === date) {
        const pid = ci.relationships?.person?.data?.id;
        if (pid) {
          personIds.add(pid);
          const checker = ci.relationships?.checked_in_by?.data?.id;
          if (checker && checker !== pid) checkerByPerson.set(pid, checker);
        }
      } else if (day < date) {
        reachedOlder = true;
      }
    }
    if (reachedOlder) break;
    nextUrl = data.links?.next || null;
  }

  return { eventName: event.attributes.name, personIds, checkerByPerson };
}
