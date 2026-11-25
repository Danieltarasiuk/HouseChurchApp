'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import esLocale from '@fullcalendar/core/locales/es';
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { useChurch } from '@/context/ChurchContext';
import { CALENDAR_CATEGORIES, CalendarCategory } from '@/lib/calendarCategories';
import { addDaysISO, toLocalISODate } from '@/lib/calendarDates';
import { EventDetails, formatWhen, type CalendarEvent } from './EventModal';

type View = 'list' | 'month';

/** How far ahead the list looks. */
const LIST_DAYS = 365;

/** Date parts as a local Date, never via new Date('YYYY-MM-DD') (that is UTC). */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

async function fetchEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const res = await fetch(`/api/calendar-events?from=${from}&to=${to}`);
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  // The Events page is church events only, whoever opens it (the API already
  // gives members nothing else; admins and leaders get both kinds).
  return (data.events as CalendarEvent[]).filter((e) => e.visibility === 'members');
}

/**
 * Members' Events page: the church's events (calendar_events.visibility =
 * 'members'), as a list of what's coming up, or a month at a time.
 */
export function ChurchEvents() {
  const { language, t, label } = useLang();
  const { church } = useChurch();
  const [view, setView] = useState<View>('list');
  const [details, setDetails] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState(false);

  // List: today onward.
  const [upcoming, setUpcoming] = useState<CalendarEvent[] | null>(null);
  useEffect(() => {
    if (view !== 'list') return;
    const from = toLocalISODate(new Date());
    fetchEvents(from, addDaysISO(from, LIST_DAYS))
      .then((rows) => {
        setUpcoming(rows);
        setError(false);
      })
      .catch(() => setError(true));
  }, [view]);

  // Month: whatever FullCalendar shows.
  const calRef = React.useRef<FullCalendar>(null);
  const [monthRows, setMonthRows] = useState<CalendarEvent[]>([]);
  const [monthTitle, setMonthTitle] = useState('');
  const onDatesSet = useCallback((info: DatesSetArg) => {
    setMonthTitle(info.view.title);
    const from = toLocalISODate(info.start);
    const to = addDaysISO(toLocalISODate(info.end), -1);
    fetchEvents(from, to)
      .then((rows) => {
        setMonthRows(rows);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  const titleOf = useCallback((e: CalendarEvent) => (language === 'es' ? e.title_es || e.title_en : e.title_en), [language]);

  // The list, grouped by the month each event starts in (or today's month,
  // for one already under way).
  const groups = useMemo(() => {
    if (!upcoming) return [];
    const today = toLocalISODate(new Date());
    const monthFmt = new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en', { month: 'long', year: 'numeric' });
    const out: { key: string; label: string; events: CalendarEvent[] }[] = [];
    for (const e of upcoming) {
      const first = e.start_date < today ? today : e.start_date;
      const key = first.slice(0, 7);
      let group = out.find((g) => g.key === key);
      if (!group) {
        const name = monthFmt.format(localDate(`${key}-01`));
        group = { key, label: name.charAt(0).toUpperCase() + name.slice(1), events: [] };
        out.push(group);
      }
      group.events.push(e);
    }
    return out;
  }, [upcoming, language]);

  const monthEvents: EventInput[] = useMemo(
    () =>
      monthRows.map((r) => {
        const cat = CALENDAR_CATEGORIES[r.category as CalendarCategory];
        const timed = !!(r.start_time && r.end_time);
        return {
          id: r.id,
          title: titleOf(r),
          start: timed ? `${r.start_date}T${r.start_time}:00` : r.start_date,
          end: timed ? `${r.end_date}T${r.end_time}:00` : addDaysISO(r.end_date, 1),
          allDay: !timed,
          backgroundColor: cat?.color,
          borderColor: cat?.color,
          textColor: '#fff',
          classNames: r.status === 'cancelled' ? ['cal-ev-cancelled'] : [],
          extendedProps: { row: r },
        };
      }),
    [monthRows, titleOf]
  );

  const dayFmt = useMemo(() => new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en', { day: 'numeric' }), [language]);
  const dowFmt = useMemo(() => new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en', { weekday: 'short' }), [language]);
  const api = () => calRef.current?.getApi();

  return (
    <div className="events-page" data-testid="events-page">
      <div className="page-header events-header">
        <div>
          <h2>{t('events.title')}</h2>
          <p>{t('events.sub').replace('{church}', church?.name ?? '')}</p>
        </div>
        <div className="cal-segmented" role="tablist">
          {(['list', 'month'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {t(v === 'list' ? 'events.viewList' : 'events.viewMonth')}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="cal-form-error" role="alert">{t('cal.error')}</div>}

      {view === 'list' ? (
        upcoming === null ? (
          !error && <p className="events-empty">{t('dashboard.loading')}</p>
        ) : groups.length === 0 ? (
          <div className="card events-empty-card">
            <p className="events-empty">{t('events.empty')}</p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.key} className="events-month">
              <h3 className="events-month-title">{g.label}</h3>
              <ul className="events-list">
                {g.events.map((e) => {
                  const cat = CALENDAR_CATEGORIES[e.category as CalendarCategory];
                  const cancelled = e.status === 'cancelled';
                  const d = localDate(e.start_date);
                  return (
                    <li key={e.id}>
                      <button type="button" className="card events-item" onClick={() => setDetails(e)} data-testid="events-item">
                        <span className="events-date" style={{ '--chip': cat?.color } as React.CSSProperties}>
                          <span className="events-date-dow">{dowFmt.format(d).replace('.', '')}</span>
                          <span className="events-date-day">{dayFmt.format(d)}</span>
                        </span>
                        <span className="events-item-text">
                          <span className={`events-item-title${cancelled ? ' cal-strike' : ''}`}>{titleOf(e)}</span>
                          <span className="events-item-when">{formatWhen(e, language, t('cal.allDay'))}</span>
                          <span className="events-item-meta">
                            <span className="cal-cat-pill" style={{ '--chip': cat?.color } as React.CSSProperties}>
                              <span className="cal-chip-dot" />
                              {cat ? label(language === 'es' ? cat.es : cat.en) : e.category}
                            </span>
                            {cancelled && <span className="badge cal-badge-cancelled">{t('cal.statusCancelled')}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )
      ) : (
        <>
          <div className="cal-toolbar">
            <div className="cal-nav">
              <button className="btn btn-ghost cal-icon-btn" onClick={() => api()?.prev()} aria-label={t('cal.prev')}>
                <ChevronLeft size={18} />
              </button>
              <button className="btn btn-secondary cal-today" onClick={() => api()?.today()}>
                {t('cal.today')}
              </button>
              <button className="btn btn-ghost cal-icon-btn" onClick={() => api()?.next()} aria-label={t('cal.next')}>
                <ChevronRight size={18} />
              </button>
              <h3 className="cal-title">{monthTitle}</h3>
            </div>
          </div>
          <div className="card cal-card">
            <FullCalendar
              ref={calRef}
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              height="auto"
              timeZone="local"
              locale={language === 'es' ? esLocale : 'en'}
              events={monthEvents}
              dayMaxEvents={3}
              datesSet={onDatesSet}
              eventClick={(arg: EventClickArg) => {
                arg.jsEvent.preventDefault();
                setDetails(arg.event.extendedProps.row as CalendarEvent);
              }}
              eventDisplay="block"
              editable={false}
            />
            {monthRows.length === 0 && !error && <p className="events-empty events-month-empty">{t('events.monthEmpty')}</p>}
          </div>
        </>
      )}

      {details && <EventDetails event={details} onClose={() => setDetails(null)} />}
    </div>
  );
}
