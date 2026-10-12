import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@/lib/db';
import {
  getPcoSyncUserId,
  getValidPcoToken,
  fetchSundayCheckedInPersonIds,
  PcoCheckInsError,
  PCO_ERROR_MESSAGES,
} from '@/lib/pco';

function isMinor(dob: unknown): boolean {
  if (!dob) return false;
  const iso = dob instanceof Date ? dob.toISOString() : String(dob);
  const birth = new Date(iso.split('T')[0] + 'T00:00:00');
  if (isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 18;
}

/**
 * Everyone checked in to the Sunday service event in Planning Center
 * Check-Ins on `date` — kids and adults alike — plus whoever performed each
 * check-in (Check-Ins' checked_in_by): all of them were there. Read-only:
 * the attendance page uses the result to pre-tick members, and the user
 * still saves.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== 'admin' && role !== 'house_church_pastor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const date = req.nextUrl.searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  try {
    // Pastors have no PCO connection of their own; use the connected admin's.
    const tokenUserId = role === 'admin' ? session.user.id! : await getPcoSyncUserId();
    if (!tokenUserId) {
      return NextResponse.json({ error: PCO_ERROR_MESSAGES.not_connected, reason: 'not_connected' }, { status: 400 });
    }
    const tokenResult = await getValidPcoToken(tokenUserId);
    if (tokenResult.error) {
      const status = tokenResult.error === 'pco_unavailable' ? 502 : 400;
      return NextResponse.json({ error: PCO_ERROR_MESSAGES[tokenResult.error], reason: tokenResult.error }, { status });
    }

    const { eventName, personIds, checkerByPerson } =
      await fetchSundayCheckedInPersonIds(tokenResult.token, date);
    // Everyone with a check-in record was there — and so was whoever
    // performed each check-in.
    const ids = [...new Set([...personIds, ...checkerByPerson.values()])];

    const rows = ids.length
      ? await sql(
          `SELECT id, date_of_birth FROM members WHERE is_active = true AND pco_id = ANY($1::text[])`,
          [ids]
        )
      : [];

    const kidIds = rows.filter((r) => isMinor(r.date_of_birth)).map((r) => r.id as string);
    const kidIdSet = new Set(kidIds);
    const adultIds = rows.map((r) => r.id as string).filter((id) => !kidIdSet.has(id));

    return NextResponse.json({
      event_name: eventName,
      checked_in_total: personIds.size,
      kid_member_ids: kidIds,
      kids_checked_in: kidIds.length,
      adult_member_ids: adultIds,
      adults_checked_in: adultIds.length,
    });
  } catch (error) {
    if (error instanceof PcoCheckInsError) {
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json(
          { error: 'Planning Center needs Check-Ins access. An admin must reconnect Planning Center in Settings.', reason: 'needs_reconnect' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: error.status === 404 ? 404 : 502 });
    }
    console.error('PCO check-ins error:', error);
    return NextResponse.json({ error: 'Failed to load check-ins' }, { status: 500 });
  }
}
