import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { todayInChurchTz } from '@/lib/churchTime';
import { ageOn } from '@/lib/directory';
import { requireViewer, leaderHcScope, LEADER_ROLES } from '@/lib/authz';
import {
  getPcoSyncUserId,
  getValidPcoToken,
  fetchSundayCheckedInPersonIds,
  PcoCheckInsError,
  PCO_ERROR_MESSAGES,
} from '@/lib/pco';

/** Under 18 today in the church's calendar (not the server's UTC date). */
function isMinor(dob: unknown): boolean {
  if (!dob) return false;
  const iso = (dob instanceof Date ? dob.toISOString() : String(dob)).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const age = ageOn(iso, todayInChurchTz());
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
  const { viewer, error } = await requireViewer({ roles: LEADER_ROLES });
  if (error) return error;
  const scope = leaderHcScope(viewer);

  const date = req.nextUrl.searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  try {
    // The church's Planning Center connection (the one the sync uses).
    const tokenUserId = await getPcoSyncUserId();
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
          // Pastors only get members of their own house church.
          `SELECT id, date_of_birth FROM members
           WHERE is_active = true AND pco_id = ANY($1::text[])
             AND ($2::text[] IS NULL OR house_church_id::text = ANY($2::text[]))`,
          [ids, scope]
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
      return NextResponse.json(
        { error: error.message, reason: error.status === 404 ? 'event_not_found' : 'pco_unavailable' },
        { status: error.status === 404 ? 404 : 502 }
      );
    }
    console.error('PCO check-ins error:', error);
    return NextResponse.json({ error: 'Failed to load check-ins' }, { status: 500 });
  }
}
