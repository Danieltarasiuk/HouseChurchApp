import { sql } from '@/lib/db';
import { geocodeMembersWithoutCoords, geocodeHouseChurchesWithoutCoords } from '@/lib/geocode';

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

async function fetchCampuses(token: string): Promise<Map<string, CampusInfo>> {
  const campusMap = new Map<string, CampusInfo>(); // pco_id -> campus info
  let nextUrl: string | null = 'https://api.planningcenteronline.com/people/v2/campuses?per_page=100';

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();

    for (const campus of data.data || []) {
      const attrs = campus.attributes;
      campusMap.set(campus.id, {
        name: attrs.name,
        street: ((attrs.street as string) || '').trim(),
        city: ((attrs.city as string) || '').trim(),
        state: ((attrs.state as string) || '').trim(),
        zip: ((attrs.zip as string) || '').trim(),
      });
    }
    nextUrl = data.links?.next || null;
  }

  return campusMap;
}

async function fetchAllPeople(token: string): Promise<{ active: SyncedPerson[]; skippedInactive: number }> {
  const active: SyncedPerson[] = [];
  let skippedInactive = 0;
  // Filter to active profiles only via PCO API
  let nextUrl: string | null =
    'https://api.planningcenteronline.com/people/v2/people?per_page=100&include=emails,phone_numbers,addresses&where[status]=active';

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`PCO API error: ${res.status}`);
    }

    const data = await res.json();

    // Build lookup maps from included resources
    const emailMap = new Map<string, string>();
    const phoneMap = new Map<string, string>();
    const addressMap = new Map<string, { street: string; city: string; state: string; zip: string }>();

    if (data.included) {
      for (const inc of data.included as PcoIncluded[]) {
        const personId = inc.relationships?.person?.data?.id;
        if (!personId) continue;

        if (inc.type === 'Email' && inc.attributes.primary) {
          emailMap.set(personId, inc.attributes.address as string);
        }
        if (inc.type === 'PhoneNumber' && inc.attributes.primary) {
          phoneMap.set(personId, inc.attributes.number as string);
        }
        if (inc.type === 'Address' && inc.attributes.primary) {
          const line1 = ((inc.attributes.street_line_1 as string) || '').trim();
          const line2 = ((inc.attributes.street_line_2 as string) || '').trim();
          const street = line2 ? `${line1}, ${line2}` : line1;
          addressMap.set(personId, {
            street,
            city: ((inc.attributes.city as string) || '').trim(),
            state: ((inc.attributes.state as string) || '').trim(),
            zip: ((inc.attributes.zip as string) || '').trim(),
          });
        }
      }
    }

    for (const person of data.data as PcoPerson[]) {
      // Secondary check: skip any non-active person that slipped through
      if (person.attributes.status && person.attributes.status !== 'active') {
        skippedInactive++;
        continue;
      }

      const email = emailMap.get(person.id) || '';
      const phone = phoneMap.get(person.id) || '';
      const addr = addressMap.get(person.id);
      const campusId = person.relationships?.primary_campus?.data?.id || null;

      // Map PCO gender "M"/"F" to "Male"/"Female"
      const rawGender = person.attributes.gender;
      const gender = rawGender === 'M' ? 'Male' : rawGender === 'F' ? 'Female' : null;

      active.push({
        pco_id: person.id,
        first_name: person.attributes.first_name,
        last_name: person.attributes.last_name,
        email: email.toLowerCase().trim(),
        phone,
        campus_pco_id: campusId,
        gender,
        date_of_birth: person.attributes.birthdate || null,
        address_street: addr?.street || '',
        address_city: addr?.city || '',
        address_state: addr?.state || '',
        address_zip: addr?.zip || '',
      });
    }

    nextUrl = data.links?.next || null;
  }

  return { active, skippedInactive };
}

export interface PcoSyncResult {
  imported: number;
  skipped: number;
  archived: number;
  geocoded: number;
  hcGeocoded: number;
  total: number;
  campuses: number;
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
 * members, deactivation of people no longer active in PCO, then geocoding.
 *
 * Shared by the manual "Sync Members" route and the weekly cron.
 */
export async function runPcoSync(token: string, opts: PcoSyncOptions = {}): Promise<PcoSyncResult> {
  // 1. Fetch campuses and active people from PCO
  const [pcoCampuses, peopleResult] = await Promise.all([
    fetchCampuses(token),
    fetchAllPeople(token),
  ]);
  const { active: people, skippedInactive } = peopleResult;

  // 2. Sync campuses → house_churches
  const campusToHcId = new Map<string, string>();

  for (const [pcoId, campusInfo] of pcoCampuses) {
    const existing = await sql(
      'SELECT id FROM house_churches WHERE pco_campus_id = $1',
      [pcoId]
    );

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

  // 3. Sync people → members
  let imported = 0;
  const skipped = skippedInactive;
  let archived = 0;
  const syncedPcoIds: string[] = [];

  for (const person of people) {
    syncedPcoIds.push(person.pco_id);
    // Resolve house church from PCO campus — null if person has no campus
    const hcId = person.campus_pco_id ? (campusToHcId.get(person.campus_pco_id) || null) : null;

    const result = await sql(
      `INSERT INTO members (first_name, last_name, email, phone, house_church_id,
                            gender, date_of_birth,
                            address_street, address_city, address_state, address_zip,
                            pco_id, campus_pco_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
       ON CONFLICT (pco_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         email = COALESCE(NULLIF(EXCLUDED.email, ''), members.email),
         phone = COALESCE(NULLIF(EXCLUDED.phone, ''), members.phone),
         house_church_id = EXCLUDED.house_church_id,
         gender = COALESCE(EXCLUDED.gender, members.gender),
         date_of_birth = COALESCE(EXCLUDED.date_of_birth, members.date_of_birth),
         address_street = COALESCE(NULLIF(EXCLUDED.address_street, ''), members.address_street),
         address_city = COALESCE(NULLIF(EXCLUDED.address_city, ''), members.address_city),
         address_state = COALESCE(NULLIF(EXCLUDED.address_state, ''), members.address_state),
         address_zip = COALESCE(NULLIF(EXCLUDED.address_zip, ''), members.address_zip),
         campus_pco_id = EXCLUDED.campus_pco_id,
         is_active = true
       RETURNING id`,
      [
        person.first_name, person.last_name, person.email || null,
        person.phone || null, hcId,
        person.gender || null, person.date_of_birth || null,
        person.address_street || null, person.address_city || null,
        person.address_state || null, person.address_zip || null,
        person.pco_id, person.campus_pco_id || null,
      ]
    );

    if (result.length > 0) imported++;
  }

  // 4. Deactivate members whose PCO ID is no longer in the active results
  //    (they were removed or marked inactive in PCO)
  //    Only affects PCO-synced members — manually added members (pco_id IS NULL) are untouched
  if (syncedPcoIds.length > 0) {
    const placeholders = syncedPcoIds.map((_, i) => `$${i + 1}`).join(',');
    const archivedResult = await sql(
      `UPDATE members SET is_active = false
       WHERE pco_id IS NOT NULL AND pco_id NOT IN (${placeholders}) AND is_active = true
       RETURNING id`,
      syncedPcoIds
    );
    archived = archivedResult.length;
  }

  // 5. Batch geocode house churches that have address but no lat/lng
  let hcGeocoded = 0;
  try {
    hcGeocoded = await geocodeHouseChurchesWithoutCoords({ deadline: opts.geocodeDeadline });
  } catch (e) {
    console.error('HC geocoding batch error (non-fatal):', e);
  }

  // 6. Batch geocode members who have address but no lat/lng.
  //    Nominatim's 1 req/sec limit makes this the slow step, so it runs last
  //    and against a deadline — anything left over is retried next sync.
  let geocoded = 0;
  try {
    geocoded = await geocodeMembersWithoutCoords({ deadline: opts.geocodeDeadline });
  } catch (e) {
    console.error('Geocoding batch error (non-fatal):', e);
  }

  return {
    imported,
    skipped,
    archived,
    geocoded,
    hcGeocoded,
    total: people.length,
    campuses: pcoCampuses.size,
  };
}
