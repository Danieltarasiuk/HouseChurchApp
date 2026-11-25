import { auth } from '@/lib/auth';
import { LeadershipCalendar, CalendarNoAccess } from '@/components/calendar/LeadershipCalendar';

/** Leadership calendar: admins edit, group pastors read, members are refused. */
export default async function CalendarPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role !== 'admin' && role !== 'group_leader') {
    return <CalendarNoAccess />;
  }

  return <LeadershipCalendar role={role} />;
}
