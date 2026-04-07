import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ connected: false });
  }

  try {
    const rows = await sql(
      'SELECT id FROM pco_tokens WHERE user_id = $1',
      [session.user.id]
    );
    return NextResponse.json({ connected: rows.length > 0 });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
