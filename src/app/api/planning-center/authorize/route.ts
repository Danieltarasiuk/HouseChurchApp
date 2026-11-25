import { NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { newPcoState, pcoStateCookieOptions, PCO_STATE_COOKIE } from '@/lib/pcoOAuthState';
import { inChurch } from '@/lib/churchRoute';

async function handleGET() {
  const { viewer, error: authError } = await requireViewer();
  if (authError) return authError;

  const userRole = viewer.role;
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

export const GET = inChurch(handleGET);
