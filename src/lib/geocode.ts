import { sql } from '@/lib/db';

/**
 * Strip apartment/unit/suite suffixes from a street address.
 * Nominatim often fails when these are included.
 * e.g. "620 NW 214th St, Apartment 5" → "620 NW 214th St"
 *      "2319 W 60th St, Apt D210" → "2319 W 60th St"
 */
function stripUnit(street: string): string {
  // Remove ", Apt ...", ", Unit ...", ", Suite ...", ", # ...", etc.
  return street.replace(/,?\s*(apt|apartment|unit|suite|ste|bldg|building|fl|floor|rm|room|#)\s*.*/i, '').trim();
}

/**
 * Build a formatted address string with street first.
 * Result: "123 Main St, Miami, FL 33165"
 */
export function buildAddress(street: string, city: string, state: string, zip: string): string {
  const stateZip = state && zip ? `${state} ${zip}` : state || zip;
  return [street, city, stateZip].filter(Boolean).join(', ');
}

/**
 * Build a geocoding-friendly address by stripping unit/apt info from street.
 */
function buildGeocodingAddress(street: string, city: string, state: string, zip: string): string {
  const cleanStreet = stripUnit(street);
  return buildAddress(cleanStreet, city, state, zip);
}

/**
 * Geocode an address string using Nominatim (free, no API key).
 * Returns { lat, lng } or null if geocoding fails.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  return (await lookupAddress(address)).coords;
}

/**
 * Like geocodeAddress, but tells "the geocoder failed" (non-2xx, network,
 * bad JSON — worth a sync warning) apart from "no match for this address".
 */
async function lookupAddress(address: string): Promise<{ coords: { lat: number; lng: number } | null; error: boolean }> {
  if (!address.trim()) return { coords: null, error: false };

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HouseChurchApp/1.0' },
    });
    if (!res.ok) {
      console.error(`Nominatim ${res.status} for: ${address}`);
      return { coords: null, error: true };
    }

    const data = await res.json();
    if (data[0]) {
      return { coords: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }, error: false };
    }
    console.log(`No geocode result for: ${address}`);
    return { coords: null, error: false };
  } catch (err) {
    console.error(`Geocoding exception for ${address}:`, err);
    return { coords: null, error: true };
  }
}

export interface GeocodeBatchResult {
  geocoded: number;
  /** Lookups that failed with a geocoder error (not "no match"). */
  errors: number;
}

export interface GeocodeBatchOptions {
  /**
   * Epoch ms after which the batch stops early. Rows that were not reached
   * keep their null lat/lng and are picked up by the next run.
   */
  deadline?: number;
}

/**
 * Batch geocode members who have an address but null lat/lng.
 * Respects Nominatim's 1 request/second rate limit.
 * Called after PCO sync upsert completes.
 */
export async function geocodeMembersWithoutCoords(opts: GeocodeBatchOptions = {}): Promise<GeocodeBatchResult> {
  // Find members with address but no coords
  const rows = await sql(
    `SELECT id, address_street, address_city, address_state, address_zip
     FROM members
     WHERE is_active = true
       AND latitude IS NULL
       AND (address_street IS NOT NULL AND address_street != ''
            OR address_city IS NOT NULL AND address_city != '')
     LIMIT 500`
  );

  let geocoded = 0;
  let errors = 0;

  for (const row of rows) {
    // Only undefined means "no deadline" (0 is a deadline already passed).
    if (opts.deadline !== undefined && Date.now() >= opts.deadline) break;

    const address = buildGeocodingAddress(
      row.address_street || '',
      row.address_city || '',
      row.address_state || '',
      row.address_zip || '',
    );

    if (!address) continue;

    const { coords, error } = await lookupAddress(address);
    if (error) errors++;
    if (coords) {
      await sql(
        'UPDATE members SET latitude = $1, longitude = $2 WHERE id = $3',
        [coords.lat, coords.lng, row.id]
      );
      geocoded++;
    }

    // Respect Nominatim rate limit: 1 request/second
    await new Promise(r => setTimeout(r, 1100));
  }

  return { geocoded, errors };
}

/**
 * Fire-and-forget geocode for a group address.
 * Updates the groups row with lat/lng.
 */
export function geocodeGroupAsync(groupId: string, street: string, city: string, state: string, zip: string): void {
  const address = buildGeocodingAddress(street, city, state, zip);
  if (!address) return;

  // Fire and forget — don't await
  geocodeAddress(address)
    .then(async (coords) => {
      if (coords) {
        await sql(
          'UPDATE groups SET latitude = $1, longitude = $2 WHERE id = $3',
          [coords.lat, coords.lng, groupId]
        );
      }
    })
    .catch((err) => {
      console.error('Group geocode error:', err);
    });
}

/**
 * Batch geocode groups that have address data but null lat/lng.
 * Respects Nominatim's 1 request/second rate limit.
 * Called after PCO sync campus upsert completes.
 */
export async function geocodeGroupsWithoutCoords(opts: GeocodeBatchOptions = {}): Promise<GeocodeBatchResult> {
  const rows = await sql(
    `SELECT id, address_street, address_city, address_state, address_zip
     FROM groups
     WHERE is_active = true
       AND latitude IS NULL
       AND (address_street IS NOT NULL AND address_street != ''
            OR address_city IS NOT NULL AND address_city != '')
     LIMIT 50`
  );

  let geocoded = 0;
  let errors = 0;

  for (const row of rows) {
    // Only undefined means "no deadline" (0 is a deadline already passed).
    if (opts.deadline !== undefined && Date.now() >= opts.deadline) break;

    const address = buildGeocodingAddress(
      row.address_street || '',
      row.address_city || '',
      row.address_state || '',
      row.address_zip || '',
    );

    if (!address) continue;

    const { coords, error } = await lookupAddress(address);
    if (error) errors++;
    if (coords) {
      await sql(
        'UPDATE groups SET latitude = $1, longitude = $2 WHERE id = $3',
        [coords.lat, coords.lng, row.id]
      );
      geocoded++;
    }

    // Respect Nominatim rate limit: 1 request/second
    await new Promise(r => setTimeout(r, 1100));
  }

  return { geocoded, errors };
}
