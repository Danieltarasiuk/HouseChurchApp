import { NextResponse } from 'next/server';
import { sql, currentChurchId } from '@/lib/db';
import { requireViewer } from '@/lib/authz';
import { cookies } from 'next/headers';
import { pcoStateMatches, PCO_STATE_COOKIE } from '@/lib/pcoOAuthState';
import { parseTokenResponse } from '@/lib/pco';
import { inChurch } from '@/lib/churchRoute';

async function handleGET(request: Request) {
  // Admins of the current church only; the token is stored for that church.
  const { viewer, error: authError } = await requireViewer({ roles: ['admin'] });
  if (authError) return NextResponse.redirect(new URL('/settings', request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // CSRF: the state must match the one /authorize gave this browser. The
  // cookie is single-use, so it is cleared whatever the outcome.
  const cookieStore = await cookies();
  const storedState = cookieStore.get(PCO_STATE_COOKIE)?.value;
  cookieStore.delete({ name: PCO_STATE_COOKIE, path: '/api/planning-center/callback' });
  if (!pcoStateMatches(searchParams.get('state'), storedState)) {
    const redirectUrl = new URL('/settings', request.url);
    redirectUrl.searchParams.set('pco_error', 'state_mismatch');
    return NextResponse.redirect(redirectUrl);
  }

  if (error || !code) {
    const redirectUrl = new URL('/settings', request.url);
    redirectUrl.searchParams.set('pco_error', error || 'no_code');
    return NextResponse.redirect(redirectUrl);
  }

  const clientId = process.env.PCO_APP_ID!;
  const clientSecret = process.env.PCO_SECRET!;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/planning-center/callback`;

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://api.planningcenteronline.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.text();
      console.error('PCO token exchange failed:', errData);
      const redirectUrl = new URL('/settings', request.url);
      redirectUrl.searchParams.set('pco_error', 'token_failed');
      return NextResponse.redirect(redirectUrl);
    }

    const parsed = parseTokenResponse(await tokenRes.json());
    if (!parsed.ok) {
      // Never store a missing token; keep whatever connection already exists.
      console.error('PCO token exchange returned no access_token or refresh_token');
      const redirectUrl = new URL('/settings', request.url);
      redirectUrl.searchParams.set('pco_error', 'token_failed');
      return NextResponse.redirect(redirectUrl);
    }

    // Store the token, expiring when PCO says it does
    await sql(
      `INSERT INTO pco_tokens (church_id, user_id, access_token, refresh_token, expires_at)
       VALUES ($5, $1, $2, $3, NOW() + make_interval(secs => $4))
       ON CONFLICT (church_id, user_id) DO UPDATE
       SET access_token = $2, refresh_token = $3, expires_at = NOW() + make_interval(secs => $4)`,
      [viewer.userId, parsed.accessToken, parsed.refreshToken, parsed.expiresIn, currentChurchId()]
    );

    const redirectUrl = new URL('/settings', request.url);
    redirectUrl.searchParams.set('pco_connected', 'true');
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error('PCO callback error:', err);
    const redirectUrl = new URL('/settings', request.url);
    redirectUrl.searchParams.set('pco_error', 'server_error');
    return NextResponse.redirect(redirectUrl);
  }
}

export const GET = inChurch(handleGET);
