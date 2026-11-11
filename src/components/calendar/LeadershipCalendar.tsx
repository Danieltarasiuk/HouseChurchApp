'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type { DatesSetArg, EventClickArg, EventInput, DayHeaderContentArg } from '@fullcalendar/core';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_KEYS,
  CalendarCategory,
} from '@/lib/calendarCategories';
import { addDaysISO, toLocalISODate } from '@/lib/calendarDates';
import { YearGrid } from './YearGrid';
import { EventModal, EventDetails, type CalendarEvent, type EventDraft, emptyDraft, draftFromEvent } from './EventModal';

/** `yearGrid` is our own dot overview; the others are FullCalendar views. */
type ViewKey = 'month' | 'monthList' | 'yearGrid' | 'year';
type FcViewKey = Exclude<ViewKey, 'yearGrid'>;
const VIEW_ORDER: ViewKey[] = ['month', 'monthList', 'yearGrid', 'year'];
const VIEW_LABEL: Record<ViewKey, string> = {
  month: 'cal.viewMonth',
  monthList: 'cal.viewMonthList',
  yearGrid: 'cal.viewYearGrid',
  year: 'cal.viewYear',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
const FC_VIEW: Record<FcViewKey, string> ={ month: 'dayGridMonth', monthList: 'listMonth', year: 'listYear' };

export function CalendarNoAccess() {
  const { t } = useLang();
  return (
    <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: 8 }}>403</h2>
      <p style={{ color: 'var(--text-secondary)' }}>{t('cal.noAccess')}</p>
    </div>
  );
}

export function LeadershipCalendar({ role }: { role: 'admin' | 'house_church_pastor' }) {
  const { language, t } = useLang();
  const isAdmin = role === 'admin';
  const calRef = useRef<FullCalendar>(null);

  const [view, setView] = useState<ViewKey>('month');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [viewTitle, setViewTitle] = useState('');
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  // Where FullCalendar should open when it (re)mounts after the year grid.
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const isGrid = view === 'yearGrid';
  const [rows, setRows] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Set<CalendarCategory>>(new Set(CALENDAR_CATEGORY_KEYS));
  const [showCancelled, setShowCancelled] = useState(true);
  const [isPhone, setIsPhone] = useState(false);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [details, setDetails] = useState<CalendarEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'warn' } | null>(null);

  // Phone: default to the month list and a compact toolbar.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsPhone(mq.matches);
    if (mq.matches) setView('monthList');
    const onChange = (e: MediaQueryListEvent) => setIsPhone(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (view === 'yearGrid') return;
    calRef.current?.getApi().changeView(FC_VIEW[view]);
  }, [view]);

  // Year grid: FullCalendar is unmounted, so range and title come from the year.
  useEffect(() => {
    if (!isGrid) return;
    const from = `${viewYear}-01-01`;
    const to = `${viewYear}-12-31`;
    setRange((cur) => (cur && cur.from === from && cur.to === to ? cur : { from, to }));
    setViewTitle(String(viewYear));
  }, [isGrid, viewYear]);

  const gotoGridYear = (year: number) => {
    setViewYear(year);
    const now = new Date();
    setAnchorDate(year === now.getFullYear() ? now : new Date(year, 0, 1));
  };

  const showToast = useCallback((text: string, kind: 'ok' | 'warn' = 'ok') => {
    setToast({ text, kind });
    window.setTimeout(() => setToast((cur) => (cur?.text === text ? null : cur)), 5000);
  }, []);

  const load = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar-events?from=${range.from}&to=${range.to}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRows(data.events as CalendarEvent[]);
    } catch {
      showToast(t('cal.error'), 'warn');
    } finally {
      setLoading(false);
    }
  }, [range, showToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const onDatesSet = useCallback((info: DatesSetArg) => {
    // info.end is exclusive.
    const from = toLocalISODate(info.start);
    const to = addDaysISO(toLocalISODate(info.end), -1);
    setRange((cur) => (cur && cur.from === from && cur.to === to ? cur : { from, to }));
    setViewTitle(info.view.title);
    setViewYear(info.view.currentStart.getFullYear());
    setAnchorDate(info.view.currentStart);
  }, []);

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          categories.has(r.category as CalendarCategory) &&
          (showCancelled || r.status !== 'cancelled')
      ),
    [rows, categories, showCancelled]
  );

  const isList = view !== 'month';

  const fcEvents: EventInput[] = useMemo(() => {
    const rangeFmt = new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en', { month: 'short', day: 'numeric' });
    const partsDate = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    return visibleRows.map((r) => {
      const cat = CALENDAR_CATEGORIES[r.category as CalendarCategory];
      const title = language === 'es' ? r.title_es || r.title_en : r.title_en;
      const timed = !!(r.start_time && r.end_time);
      const classNames: string[] = [];
      if (r.status === 'cancelled') classNames.push('cal-ev-cancelled');
      if (r.sync_status === 'error') classNames.push('cal-ev-sync-error');

      // FullCalendar's all-day end is exclusive; ours is inclusive.
      let start = timed ? `${r.start_date}T${r.start_time}:00` : r.start_date;
      let end = timed ? `${r.end_date}T${r.end_time}:00` : addDaysISO(r.end_date, 1);
      let rangeLabel: string | null = null;

      // List views would repeat a multi-day all-day event on every day it
      // covers (the July break = 31 rows). Show it once, on its first visible
      // day, with the date range in the time column instead.
      if (isList && !timed && r.end_date > r.start_date) {
        const first = range && r.start_date < range.from ? range.from : r.start_date;
        start = first;
        end = addDaysISO(first, 1);
        rangeLabel = rangeFmt.formatRange(partsDate(r.start_date), partsDate(r.end_date));
      }

      return {
        id: r.id,
        title,
        start,
        end,
        allDay: !timed,
        backgroundColor: cat?.color,
        borderColor: cat?.color,
        textColor: '#fff',
        classNames,
        extendedProps: { row: r, rangeLabel },
      };
    });
  }, [visibleRows, language, isList, range]);

  // Year view: first listed day of each month gets a month heading + chip target.
  // In list views every event is listed only on its (first visible) start day.
  const firstDayOfMonth = useMemo(() => {
    const map = new Map<number, string>();
    if (view !== 'year') return map;
    for (const ev of fcEvents) {
      const d = String(ev.start).slice(0, 10);
      if (!d.startsWith(String(viewYear))) continue;
      const m = Number(d.slice(5, 7)) - 1;
      const cur = map.get(m);
      if (!cur || d < cur) map.set(m, d);
    }
    return map;
  }, [fcEvents, view, viewYear]);

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en', { month: 'long' });
    const short = new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en', { month: 'short' });
    return Array.from({ length: 12 }, (_, m) => ({
      long: fmt.format(new Date(2027, m, 1)),
      short: short.format(new Date(2027, m, 1)).replace('.', ''),
    }));
  }, [language]);

  const renderDayHeader = useCallback(
    (arg: DayHeaderContentArg & { text?: string; sideText?: string }) => {
      // dayGrid column headers: `true` = FullCalendar's default rendering.
      if (!arg.view.type.startsWith('list')) return true;
      const iso = toLocalISODate(arg.date);
      const m = arg.date.getMonth();
      const isFirst = arg.view.type === 'listYear' && firstDayOfMonth.get(m) === iso;
      // HTML strings, not JSX: JSX here is rendered through a React portal
      // per cell and floods the console with flushSync errors.
      const heading = isFirst
        ? `<div id="cal-month-${m}" class="cal-month-heading">${escapeHtml(`${monthNames[m].long} ${arg.date.getFullYear()}`)}</div>`
        : '';
      return {
        html: `${heading}<span class="fc-list-day-text">${escapeHtml(arg.text ?? '')}</span><span class="fc-list-day-side-text">${escapeHtml(arg.sideText ?? '')}</span>`,
      };
    },
    [firstDayOfMonth, monthNames]
  );

  const scrollToMonth = (m: number) => {
    document.getElementById(`cal-month-${m}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onDateClick = (arg: DateClickArg) => {
    if (!isAdmin) return;
    setDraft(emptyDraft(arg.dateStr.slice(0, 10)));
  };

  const onEventClick = (arg: EventClickArg) => {
    arg.jsEvent.preventDefault();
    const row = arg.event.extendedProps.row as CalendarEvent;
    if (isAdmin) setDraft(draftFromEvent(row));
    else setDetails(row);
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/calendar-events/sync-pending', { method: 'POST' });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (data.attempted === 0) showToast(t('cal.syncNothing'));
      else
        showToast(
          t('cal.syncResult').replace('{synced}', String(data.synced)).replace('{failed}', String(data.failed)),
          data.failed > 0 ? 'warn' : 'ok'
        );
      await load();
    } catch {
      showToast(t('cal.error'), 'warn');
    } finally {
      setSyncing(false);
    }
  };

  const toggleCategory = (key: CalendarCategory) => {
    setCategories((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const api = () => calRef.current?.getApi();

  return (
    <div className={`cal-page${isPhone ? ' cal-phone' : ''}`}>
      <div className="page-header cal-page-header">
        <div>
          <h2>{t('cal.title')}</h2>
          <p>{isAdmin ? t('cal.sub') : t('cal.subPastor')}</p>
        </div>
        {isAdmin && (
          <button className="btn btn-secondary" onClick={runSync} disabled={syncing} data-testid="cal-sync">
            <RefreshCw size={16} className={syncing ? 'cal-spin' : ''} />
            {syncing ? t('cal.syncing') : t('cal.sync')}
          </button>
        )}
      </div>

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button
            className="btn btn-ghost cal-icon-btn"
            onClick={() => (isGrid ? gotoGridYear(viewYear - 1) : api()?.prev())}
            aria-label={t('cal.prev')}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="btn btn-secondary cal-today"
            onClick={() => (isGrid ? gotoGridYear(new Date().getFullYear()) : api()?.today())}
          >
            {t('cal.today')}
          </button>
          <button
            className="btn btn-ghost cal-icon-btn"
            onClick={() => (isGrid ? gotoGridYear(viewYear + 1) : api()?.next())}
            aria-label={t('cal.next')}
          >
            <ChevronRight size={18} />
          </button>
          <h3 className="cal-title">{viewTitle}</h3>
          {loading && <span className="cal-loading">{t('dashboard.loading')}</span>}
        </div>
        <div className="cal-segmented" role="tablist">
          {VIEW_ORDER.map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              className={view === v ? 'active' : ''}
              onClick={() => setView(v)}
            >
              {t(VIEW_LABEL[v])}
            </button>
          ))}
        </div>
      </div>

      <div className="cal-filters">
        <div className="cal-chips">
          {CALENDAR_CATEGORY_KEYS.map((key) => {
            const cat = CALENDAR_CATEGORIES[key];
            const on = categories.has(key);
            return (
              <button
                key={key}
                className={`cal-chip${on ? ' on' : ''}`}
                style={{ '--chip': cat.color } as React.CSSProperties}
                onClick={() => toggleCategory(key)}
                aria-pressed={on}
              >
                <span className="cal-chip-dot" />
                {language === 'es' ? cat.es : cat.en}
              </button>
            );
          })}
          <button className="cal-chip-link" onClick={() => setCategories(new Set(CALENDAR_CATEGORY_KEYS))}>
            {t('cal.all')}
          </button>
          <button className="cal-chip-link" onClick={() => setCategories(new Set())}>
            {t('cal.none')}
          </button>
        </div>
        <label className="cal-toggle">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          {t('cal.showCancelled')}
        </label>
      </div>

      {view === 'year' && (
        <div className="cal-month-chips">
          {monthNames.map((mn, m) => (
            <button key={m} disabled={!firstDayOfMonth.has(m)} onClick={() => scrollToMonth(m)}>
              {mn.short}
            </button>
          ))}
        </div>
      )}

      <div className={`card cal-card${isAdmin ? ' cal-admin' : ''}`}>
        {isGrid ? (
          <YearGrid
            year={viewYear}
            events={visibleRows}
            isAdmin={isAdmin}
            onOpenEvent={(row) => (isAdmin ? setDraft(draftFromEvent(row)) : setDetails(row))}
            onNewEvent={(date) => setDraft(emptyDraft(date))}
          />
        ) : (
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
          initialView={FC_VIEW[view]}
          initialDate={anchorDate}
          views={{
            listYear: { type: 'list', duration: { years: 1 }, dateAlignment: 'year' },
          }}
          headerToolbar={false}
          height="auto"
          timeZone="local"
          locale={language === 'es' ? esLocale : 'en'}
          events={fcEvents}
          dayMaxEvents={isPhone ? 2 : 3}
          datesSet={onDatesSet}
          dateClick={onDateClick}
          eventClick={onEventClick}
          dayHeaderContent={renderDayHeader}
          editable={false}
          eventDisplay="block"
          displayEventEnd={view !== 'month'}
          eventContent={(arg) => {
            const label = arg.event.extendedProps.rangeLabel as string | null;
            // `true` = FullCalendar's default rendering (undefined renders nothing).
            if (!label || !arg.view.type.startsWith('list')) return true;
            return { html: `<a>${escapeHtml(arg.event.title)} <span class="cal-range">· ${escapeHtml(label)}</span></a>` };
          }}
        />
        )}
      </div>

      {draft && (
        <EventModal
          draft={draft}
          onClose={() => setDraft(null)}
          onDuplicate={(copy) => setDraft(copy)}
          onChanged={async (message, kind) => {
            if (message) showToast(message, kind);
            await load();
          }}
        />
      )}

      {details && <EventDetails event={details} onClose={() => setDetails(null)} />}

      {toast && (
        <div className={`cal-toast ${toast.kind}`} role="status" onClick={() => setToast(null)}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
