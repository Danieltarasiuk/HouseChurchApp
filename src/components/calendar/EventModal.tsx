'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { CALENDAR_CATEGORIES, CALENDAR_CATEGORY_KEYS, CalendarCategory } from '@/lib/calendarCategories';

/** A row as returned by GET /api/calendar-events (admin-only fields optional). */
export interface CalendarEvent {
  id: string;
  title_en: string;
  title_es: string | null;
  category: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  status: 'scheduled' | 'cancelled';
  notes?: string | null;
  sync_status?: 'synced' | 'pending' | 'error';
  sync_error?: string | null;
}

export interface EventDraft {
  id: string | null; // null = new, unsaved
  isCopy: boolean;
  title_en: string;
  title_es: string;
  category: CalendarCategory;
  allDay: boolean;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  notes: string;
  status: 'scheduled' | 'cancelled';
  sync_status?: CalendarEvent['sync_status'];
  sync_error?: string | null;
}

export function emptyDraft(date: string): EventDraft {
  return {
    id: null,
    isCopy: false,
    title_en: '',
    title_es: '',
    category: 'house_church',
    allDay: true,
    start_date: date,
    end_date: date,
    start_time: '19:00',
    end_time: '21:00',
    notes: '',
    status: 'scheduled',
  };
}

export function draftFromEvent(e: CalendarEvent): EventDraft {
  const timed = !!(e.start_time && e.end_time);
  return {
    id: e.id,
    isCopy: false,
    title_en: e.title_en,
    title_es: e.title_es ?? '',
    category: e.category as CalendarCategory,
    allDay: !timed,
    start_date: e.start_date,
    end_date: e.end_date,
    start_time: e.start_time ?? '19:00',
    end_time: e.end_time ?? '21:00',
    notes: e.notes ?? '',
    status: e.status,
    sync_status: e.sync_status,
    sync_error: e.sync_error,
  };
}

/** Localised "when" line built from the date parts — never via new Date('YYYY-MM-DD'). */
export function formatWhen(e: Pick<CalendarEvent, 'start_date' | 'end_date' | 'start_time' | 'end_time'>, lang: string, allDayLabel: string) {
  const loc = lang === 'es' ? 'es' : 'en';
  const toDate = (iso: string, time?: string | null) => {
    const [y, m, d] = iso.split('-').map(Number);
    const [hh, mm] = (time ?? '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm);
  };
  const dateFmt = new Intl.DateTimeFormat(loc, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat(loc, { hour: 'numeric', minute: '2-digit' });
  const sameDay = e.start_date === e.end_date;
  if (!e.start_time || !e.end_time) {
    const d = sameDay
      ? dateFmt.format(toDate(e.start_date))
      : `${dateFmt.format(toDate(e.start_date))} – ${dateFmt.format(toDate(e.end_date))}`;
    return `${d} · ${allDayLabel}`;
  }
  const s = toDate(e.start_date, e.start_time);
  const en = toDate(e.end_date, e.end_time);
  return sameDay
    ? `${dateFmt.format(s)} · ${timeFmt.format(s)} – ${timeFmt.format(en)}`
    : `${dateFmt.format(s)} ${timeFmt.format(s)} – ${dateFmt.format(en)} ${timeFmt.format(en)}`;
}

function clientValidate(d: EventDraft, t: (k: string) => string): string | null {
  if (!d.title_en.trim()) return t('cal.errTitle');
  if (!d.start_date || !d.end_date || d.end_date < d.start_date) return t('cal.errEndDate');
  if (!d.allDay) {
    if (!d.start_time || !d.end_time) return t('cal.errTimes');
    if (d.start_date === d.end_date && d.end_time <= d.start_time) return t('cal.errEndTime');
  }
  return null;
}

export function EventModal({
  draft: initial,
  onClose,
  onDuplicate,
  onChanged,
}: {
  draft: EventDraft;
  onClose: () => void;
  onDuplicate: (copy: EventDraft) => void;
  onChanged: (message: string | null, kind: 'ok' | 'warn') => Promise<void>;
}) {
  const { language, t } = useLang();
  const [d, setD] = useState<EventDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when a different draft (e.g. a duplicate) is passed in.
  const [seed, setSeed] = useState(initial);
  if (seed !== initial) {
    setSeed(initial);
    setD(initial);
    setError(null);
  }

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setD((cur) => ({ ...cur, [key]: value }));

  const payload = () => ({
    title_en: d.title_en,
    title_es: d.title_es,
    category: d.category,
    start_date: d.start_date,
    end_date: d.end_date,
    start_time: d.allDay ? null : d.start_time,
    end_time: d.allDay ? null : d.end_time,
    notes: d.notes,
    status: d.status,
  });

  /** Run a mutation; keep the modal open on failure, report Google sync outcome on success. */
  const mutate = async (url: string, method: string, body?: unknown, closeAfter = true) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || t('cal.error'));
        return null;
      }
      const ev = data.event as CalendarEvent | undefined;
      const syncFailed = ev?.sync_status === 'error';
      if (method === 'DELETE') await onChanged(t('cal.deleted'), 'ok');
      else await onChanged(syncFailed ? t('cal.savedSyncFailed') : t('cal.saved'), syncFailed ? 'warn' : 'ok');
      if (closeAfter && !syncFailed) onClose();
      else if (ev) setD(draftFromEvent(ev)); // stay open to show the sync error
      return ev ?? null;
    } catch {
      setError(t('cal.error'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = clientValidate(d, t);
    if (err) return setError(err);
    if (d.id) await mutate(`/api/calendar-events/${d.id}`, 'PATCH', payload());
    else await mutate('/api/calendar-events', 'POST', payload());
  };

  const toggleCancelled = () =>
    d.id && mutate(`/api/calendar-events/${d.id}`, 'PATCH', { status: d.status === 'cancelled' ? 'scheduled' : 'cancelled' });

  const remove = () => {
    if (!d.id) return;
    if (!window.confirm(t('cal.deleteConfirm').replace('{title}', d.title_en))) return;
    mutate(`/api/calendar-events/${d.id}`, 'DELETE');
  };

  const retry = () => d.id && mutate(`/api/calendar-events/${d.id}/sync`, 'POST', undefined, true);

  const duplicate = () =>
    onDuplicate({ ...d, id: null, isCopy: true, status: 'scheduled', sync_status: undefined, sync_error: null });

  const heading = d.id ? t('cal.editEvent') : d.isCopy ? t('cal.newEventCopy') : t('cal.newEvent');

  return (
    <div className="verse-overlay" onClick={onClose}>
      <div className="verse-modal cal-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={heading}>
        <div className="verse-modal-header">
          <h3>{heading}</h3>
          <button className="verse-modal-close" onClick={onClose} aria-label={t('cal.close')}>
            <X size={20} />
          </button>
        </div>
        <form className="verse-modal-body" onSubmit={save}>
          {d.id && d.sync_status === 'error' && (
            <div className="cal-sync-alert">
              <AlertTriangle size={16} />
              <div>
                <strong>{t('cal.syncError')}</strong>
                {d.sync_error && <div className="cal-sync-alert-msg">{d.sync_error}</div>}
              </div>
              <button type="button" className="btn btn-secondary" onClick={retry} disabled={busy}>
                {t('cal.retrySync')}
              </button>
            </div>
          )}
          {d.id && d.sync_status === 'pending' && <div className="cal-sync-note">{t('cal.syncPending')}</div>}

          <div className="form-group">
            <label htmlFor="cal-title-en">{t('cal.titleEn')}</label>
            <input id="cal-title-en" className="form-input" value={d.title_en} onChange={(e) => set('title_en', e.target.value)} required autoFocus />
          </div>
          <div className="form-group">
            <label htmlFor="cal-title-es">{t('cal.titleEs')}</label>
            <input id="cal-title-es" className="form-input" value={d.title_es} onChange={(e) => set('title_es', e.target.value)} />
          </div>
          <div className="cal-form-row">
            <div className="form-group">
              <label htmlFor="cal-category">{t('cal.category')}</label>
              <select id="cal-category" className="form-select" value={d.category} onChange={(e) => set('category', e.target.value as CalendarCategory)}>
                {CALENDAR_CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {language === 'es' ? CALENDAR_CATEGORIES[k].es : CALENDAR_CATEGORIES[k].en}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="cal-status">{t('cal.status')}</label>
              <select id="cal-status" className="form-select" value={d.status} onChange={(e) => set('status', e.target.value as EventDraft['status'])}>
                <option value="scheduled">{t('cal.statusScheduled')}</option>
                <option value="cancelled">{t('cal.statusCancelled')}</option>
              </select>
            </div>
          </div>
          <label className="cal-toggle" style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={d.allDay} onChange={(e) => set('allDay', e.target.checked)} />
            {t('cal.allDay')}
          </label>
          <div className="cal-form-row">
            <div className="form-group">
              <label htmlFor="cal-start-date">{t('cal.startDate')}</label>
              <input
                id="cal-start-date"
                type="date"
                className="form-input"
                value={d.start_date}
                onChange={(e) => {
                  const v = e.target.value;
                  setD((cur) => ({ ...cur, start_date: v, end_date: cur.end_date < v ? v : cur.end_date }));
                }}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="cal-end-date">{t('cal.endDate')}</label>
              <input id="cal-end-date" type="date" className="form-input" value={d.end_date} min={d.start_date} onChange={(e) => set('end_date', e.target.value)} required />
            </div>
          </div>
          {!d.allDay && (
            <div className="cal-form-row">
              <div className="form-group">
                <label htmlFor="cal-start-time">{t('cal.startTime')}</label>
                <input id="cal-start-time" type="time" className="form-input" value={d.start_time} onChange={(e) => set('start_time', e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="cal-end-time">{t('cal.endTime')}</label>
                <input id="cal-end-time" type="time" className="form-input" value={d.end_time} onChange={(e) => set('end_time', e.target.value)} required />
              </div>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="cal-notes">{t('cal.notes')}</label>
            <textarea id="cal-notes" className="form-input" rows={3} value={d.notes} onChange={(e) => set('notes', e.target.value)} />
            <div className="cal-hint">{t('cal.notesHint')}</div>
          </div>

          {error && <div className="cal-form-error">{error}</div>}

          <div className="cal-modal-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? t('cal.saving') : t('cal.save')}
            </button>
            {d.id && (
              <>
                <button type="button" className="btn btn-secondary" onClick={duplicate} disabled={busy}>
                  {t('cal.duplicate')}
                </button>
                <button type="button" className="btn btn-secondary" onClick={toggleCancelled} disabled={busy}>
                  {d.status === 'cancelled' ? t('cal.restore') : t('cal.cancelEvent')}
                </button>
                <button type="button" className="btn btn-danger cal-delete" onClick={remove} disabled={busy}>
                  {t('cal.delete')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/** Read-only details for pastors: title, when, category. No notes, no sync state. */
export function EventDetails({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { language, t } = useLang();
  const cat = CALENDAR_CATEGORIES[event.category as CalendarCategory];
  const title = language === 'es' ? event.title_es || event.title_en : event.title_en;
  return (
    <div className="verse-overlay" onClick={onClose}>
      <div className="verse-modal cal-details" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="verse-modal-header">
          <h3 className={event.status === 'cancelled' ? 'cal-strike' : ''}>{title}</h3>
          <button className="verse-modal-close" onClick={onClose} aria-label={t('cal.close')}>
            <X size={20} />
          </button>
        </div>
        <div className="verse-modal-body">
          {event.status === 'cancelled' && <span className="badge cal-badge-cancelled">{t('cal.statusCancelled')}</span>}
          <div className="cal-detail-row">
            <span className="cal-detail-label">{t('cal.when')}</span>
            <span>{formatWhen(event, language, t('cal.allDay'))}</span>
          </div>
          <div className="cal-detail-row">
            <span className="cal-detail-label">{t('cal.category')}</span>
            <span className="cal-cat-pill" style={{ '--chip': cat?.color } as React.CSSProperties}>
              <span className="cal-chip-dot" />
              {cat ? (language === 'es' ? cat.es : cat.en) : event.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
