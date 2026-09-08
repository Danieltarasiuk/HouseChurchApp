import { sql } from '@/lib/db';

export type PcoErrorReason =
  | 'not_connected'
  | 'missing_credentials'
  | 'invalid_credentials'
  | 'permission_denied'
  | 'pco_unavailable';

export type PcoTokenResult =
  | { token: string; error?: undefined }
  | { token?: undefined; error: PcoErrorReason };

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
