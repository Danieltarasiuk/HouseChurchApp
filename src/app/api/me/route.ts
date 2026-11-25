import { NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { hasIncubatorAccess } from '@/lib/incubatorAccess';

/**
 * The signed-in viewer's authorization context, for pages that need to shape
 * their UI to it (e.g. a pastor's attendance page lists only their own
 * group). Display only: every API route enforces these rules itself.
 */
export async function GET() {
  const { viewer, error } = await requireViewer();
  if (error) return error;
  return NextResponse.json({
    role: viewer.role,
    memberId: viewer.memberId,
    groupId: viewer.groupId,
    ledGroupIds: viewer.ledGroupIds,
    incubatorAccess: await hasIncubatorAccess(viewer),
  });
}
