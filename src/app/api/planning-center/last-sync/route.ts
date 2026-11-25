import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { parseSyncDetail } from '@/lib/pco';

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
    const { summary, warnings } = parseSyncDetail(row.detail);
    return NextResponse.json({
      lastSync: {
        source: row.source,
        // 'failed' when the people step failed (or the run crashed);
        // 'warnings' when it succeeded with some step skipped.
        status: !row.success ? 'failed' : warnings.length ? 'warnings' : 'ok',
        summary,
        warnings,
        syncedCount: row.synced_count,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error('last-sync lookup failed:', error);
    return NextResponse.json({ lastSync: null });
  }
}
