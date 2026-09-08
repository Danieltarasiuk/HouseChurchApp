import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getValidPcoToken, verifyPcoToken } from '@/lib/pco';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ connected: false });
  }

  try {
    const result = await getValidPcoToken(session.user.id!);

    if (result.error) {
      // 'not_connected' just means the user never linked PCO — no error to show
      return NextResponse.json({
        connected: false,
        ...(result.error !== 'not_connected' ? { reason: result.error } : {}),
      });
    }

    const check = await verifyPcoToken(result.token);
    if (!check.ok) {
      return NextResponse.json({ connected: false, reason: check.error });
    }

    return NextResponse.json({ connected: true });
  } catch {
    return NextResponse.json({ connected: false, reason: 'pco_unavailable' });
  }
}
