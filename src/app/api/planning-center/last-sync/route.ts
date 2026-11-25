import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { HOUSEHOLDS_NOT_UPDATED } from '@/lib/pco';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rows = await sql(
      `SELECT source, success, detail, synced_count, created_at
       FROM sync_log
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (rows.length === 0) {
      return NextResponse.json({ lastSync: null });
    }

    const row = rows[0];
    // A sync can succeed while skipping households (cron runs included), so
    // pull the reason out of the logged detail for the settings page to show.
    const marker = `${HOUSEHOLDS_NOT_UPDATED}: `;
    const detail: string = row.detail || '';
    const householdsError = row.success && detail.includes(marker)
      ? detail.slice(detail.indexOf(marker) + marker.length)
      : null;
    return NextResponse.json({
      lastSync: {
        source: row.source,
        success: row.success,
        detail: row.detail,
        householdsError,
        syncedCount: row.synced_count,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error('last-sync lookup failed:', error);
    return NextResponse.json({ lastSync: null });
  }
}
