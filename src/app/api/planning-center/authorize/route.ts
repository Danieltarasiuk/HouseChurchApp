import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { newPcoState, pcoStateCookieOptions, PCO_STATE_COOKIE } from '@/lib/pcoOAuthState';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clientId = process.env.PCO_APP_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'PCO_APP_ID not configured' }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/planning-center/callback`;
  // One per request; the callback rejects any code without the matching value.
  const state = newPcoState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'people check_ins',
    state,
  });

  const response = NextResponse.redirect(
    `https://api.planningcenteronline.com/oauth/authorize?${params.toString()}`
  );
  response.cookies.set(PCO_STATE_COOKIE, state, pcoStateCookieOptions(baseUrl));
  return response;
}
