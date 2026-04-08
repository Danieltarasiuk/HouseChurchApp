import { sql } from '@/lib/db';

/**
 * Build a formatted address string with street first.
 * Result: "123 Main St, Miami, FL 33165"
 */
export function buildAddress(street: string, city: string, state: string, zip: string): string {
  const stateZip = state && zip ? `${state} ${zip}` : state || zip;
  return [street, city, stateZip].filter(Boolean).join(', ');
}

/**
 * Geocode an address string using Nominatim (free, no API key).
 * Returns { lat, lng } or null if geocoding fails.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim()) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HouseChurchApp/1.0' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch geocode members who have an address but null lat/lng.
 * Respects Nominatim's 1 request/second rate limit.
 * Called after PCO sync upsert completes.
 */
export async function geocodeMembersWithoutCoords(): Promise<number> {
  // Find members with address but no coords
  const rows = await sql(
    `SELECT id, address_street, address_city, address_state, address_zip
     FROM members
     WHERE is_active = true
       AND latitude IS NULL
       AND (address_street IS NOT NULL AND address_street != ''
            OR address_city IS NOT NULL AND address_city != '')
     LIMIT 200`
  );

  let geocoded = 0;

  for (const row of rows) {
    const address = buildAddress(
      row.address_street || '',
      row.address_city || '',
      row.address_state || '',
      row.address_zip || '',
    );

    if (!address) continue;

    const coords = await geocodeAddress(address);
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

  return geocoded;
}

/**
 * Fire-and-forget geocode for a house church address.
 * Updates the house_churches row with lat/lng.
 */
export function geocodeHouseChurchAsync(hcId: string, street: string, city: string, state: string, zip: string): void {
  const address = buildAddress(street, city, state, zip);
  if (!address) return;

  // Fire and forget — don't await
  geocodeAddress(address)
    .then(async (coords) => {
      if (coords) {
        await sql(
          'UPDATE house_churches SET latitude = $1, longitude = $2 WHERE id = $3',
          [coords.lat, coords.lng, hcId]
        );
      }
    })
    .catch((err) => {
      console.error('HC geocode error:', err);
    });
}
