import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.redirect(new URL('/settings', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

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

    const tokenData = await tokenRes.json();

    // Store the token in the database
    await sql(
      `INSERT INTO pco_tokens (user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7200 seconds')
       ON CONFLICT (user_id) DO UPDATE
       SET access_token = $2, refresh_token = $3, expires_at = NOW() + INTERVAL '7200 seconds'`,
      [session.user.id, tokenData.access_token, tokenData.refresh_token]
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
