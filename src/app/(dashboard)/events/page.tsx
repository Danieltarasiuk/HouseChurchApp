import { ChurchEvents } from '@/components/calendar/ChurchEvents';

/**
 * Church events, for every signed-in member of the church. GET
 * /api/calendar-events decides what each role gets; this page shows only
 * church events (visibility 'members'), whoever opens it.
 */
export default function EventsPage() {
  return <ChurchEvents />;
}
