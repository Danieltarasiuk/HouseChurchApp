'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { CALENDAR_CATEGORIES, CalendarCategory } from '@/lib/calendarCategories';
import { addDaysISO, toLocalISODate } from '@/lib/calendarDates';
import { formatWhen, type CalendarEvent } from './EventModal';

const MAX_DOTS = 4;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * Whole-year overview: 12 mini months, one colored dot per event on each day
 * it covers. Clicking a day opens a list of that day's events.
 */
export function YearGrid({
  year,
  events,
  isAdmin,
  onOpenEvent,
  onNewEvent,
}: {
  year: number;
  events: CalendarEvent[];
  isAdmin: boolean;
  onOpenEvent: (e: CalendarEvent) => void;
  onNewEvent: (date: string) => void;
}) {
  const { language, t } = useLang();
  const loc = language === 'es' ? 'es' : 'en';
  // Spanish calendars start on Monday, English on Sunday (matches FullCalendar's locales).
  const weekStart = language === 'es' ? 1 : 0;
  const [openDay, setOpenDay] = useState<string | null>(null);

  // date → events covering that date (multi-day events land on every day).
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const yStart = `${year}-01-01`;
    const yEnd = `${year}-12-31`;
    const sorted = [...events].sort(
      (a, b) =>
        a.start_date.localeCompare(b.start_date) ||
        (a.start_time ?? '').localeCompare(b.start_time ?? '') ||
        a.title_en.localeCompare(b.title_en)
    );
    for (const e of sorted) {
      let d = e.start_date < yStart ? yStart : e.start_date;
      const last = e.end_date > yEnd ? yEnd : e.end_date;
      while (d <= last) {
        const list = map.get(d);
        if (list) list.push(e);
        else map.set(d, [e]);
        d = addDaysISO(d, 1);
      }
    }
    return map;
  }, [events, year]);

  const today = toLocalISODate(new Date());

  const weekdayLetters = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(loc, { weekday: 'narrow' });
    // 2027-01-03 is a Sunday; built from parts, never parsed from a string.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2027, 0, 3 + ((i + weekStart) % 7))));
  }, [loc, weekStart]);

  const monthFmt = useMemo(() => new Intl.DateTimeFormat(loc, { month: 'long' }), [loc]);

  const title = (e: CalendarEvent) => (language === 'es' ? e.title_es || e.title_en : e.title_en);

  const dayEvents = openDay ? byDay.get(openDay) ?? [] : [];
  const openDayLabel = useMemo(() => {
    if (!openDay) return '';
    const [y, m, d] = openDay.split('-').map(Number);
    const s = new Intl.DateTimeFormat(loc, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(
      new Date(y, m - 1, d)
    );
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [openDay, loc]);

  const clickDay = (iso: string) => {
    if (byDay.has(iso)) setOpenDay(iso);
    else if (isAdmin) onNewEvent(iso);
  };

  return (
    <>
      <div className="cal-year-grid">
        {Array.from({ length: 12 }, (_, m) => {
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          const lead = (new Date(year, m, 1).getDay() - weekStart + 7) % 7;
          const name = monthFmt.format(new Date(year, m, 1));
          return (
            <div key={m} className="cal-ym">
              <div className="cal-ym-title">{name.charAt(0).toUpperCase() + name.slice(1)}</div>
              <div className="cal-ym-grid">
                {weekdayLetters.map((w, i) => (
                  <div key={`h${i}`} className="cal-ym-dow">
                    {w}
                  </div>
                ))}
                {Array.from({ length: lead }, (_, i) => (
                  <div key={`b${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const iso = `${year}-${pad(m + 1)}-${pad(i + 1)}`;
                  const list = byDay.get(iso) ?? [];
                  const clickable = list.length > 0 || isAdmin;
                  return (
                    <button
                      key={iso}
                      type="button"
                      className={`cal-ym-day${iso === today ? ' today' : ''}${list.length ? ' has' : ''}`}
                      onClick={() => clickDay(iso)}
                      disabled={!clickable}
                      title={list.map(title).join('\n') || undefined}
                      aria-label={`${iso}${list.length ? ': ' + list.map(title).join(', ') : ''}`}
                    >
                      <span className="cal-ym-num">{i + 1}</span>
                      <span className="cal-ym-dots">
                        {list.slice(0, MAX_DOTS).map((e) => {
                          const color = CALENDAR_CATEGORIES[e.category as CalendarCategory]?.color ?? '#888';
                          return (
                            <span
                              key={e.id}
                              className={`cal-ym-dot${e.status === 'cancelled' ? ' cancelled' : ''}${e.sync_status === 'error' ? ' sync-error' : ''}`}
                              style={{ '--dot': color } as React.CSSProperties}
                            />
                          );
                        })}
                        {list.length > MAX_DOTS && <span className="cal-ym-more">+</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {openDay && (
        <div className="verse-overlay cal-overlay" onClick={() => setOpenDay(null)}>
          <div className="verse-modal cal-details" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={openDayLabel}>
            <div className="verse-modal-header">
              <h3>{openDayLabel}</h3>
              <button className="verse-modal-close" onClick={() => setOpenDay(null)} aria-label={t('cal.close')}>
                <X size={20} />
              </button>
            </div>
            <div className="verse-modal-body">
              {dayEvents.map((e) => {
                const cat = CALENDAR_CATEGORIES[e.category as CalendarCategory];
                return (
                  <button
                    key={e.id}
                    type="button"
                    className="cal-day-item"
                    onClick={() => {
                      setOpenDay(null);
                      onOpenEvent(e);
                    }}
                  >
                    <span
                      className={`cal-ym-dot${e.status === 'cancelled' ? ' cancelled' : ''}`}
                      style={{ '--dot': cat?.color ?? '#888' } as React.CSSProperties}
                    />
                    <span className="cal-day-item-text">
                      <span className={`cal-day-item-title${e.status === 'cancelled' ? ' cal-strike' : ''}`}>{title(e)}</span>
                      <span className="cal-day-item-when">{formatWhen(e, language, t('cal.allDay'))}</span>
                    </span>
                    {isAdmin && e.sync_status === 'error' && <AlertTriangle size={14} color="var(--warning)" />}
                  </button>
                );
              })}
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-secondary cal-day-add"
                  onClick={() => {
                    const d = openDay;
                    setOpenDay(null);
                    onNewEvent(d);
                  }}
                >
                  <Plus size={14} /> {t('cal.addEvent')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
