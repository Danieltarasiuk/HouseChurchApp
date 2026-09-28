'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  house_church_id: string | null;
  house_church_name: string | null;
  date_of_birth: string | null;
  pco_household_id: string | null;
  household_name: string | null;
  attendance_note: string | null;
}

interface HouseChurch {
  id: string;
  name: string;
}

interface HistoryData {
  sessions: string[];
  meeting_day: string | null;
  records: { member_id: string; date: string }[];
}

interface SessionRow {
  date: string;
  attendance_type: string;
  house_church_id: string | null;
  house_church_name: string | null;
  recorded_by_name: string | null;
  present_count: number;
}

type GroupMode = 'household' | 'house_church' | 'alpha' | 'rate_desc' | 'rate_asc';

interface MemberGroup {
  key: string;
  label: string;
  /** False for the trailing "No household" / "No house church" bucket. */
  real: boolean;
  members: Member[];
}

interface Rate {
  attended: number;
  held: number;
}

function calcAge(dob: string): number | null {
  const parts = dob.split('-');
  if (parts.length !== 3) return null;
  const [y, m, day] = parts.map(Number);
  if (!y || !m || !day) return null;
  const birth = new Date(y, m - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age > 120 ? null : age;
}

const DAY_INDEX: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

/** Local-time YYYY-MM-DD — avoids the UTC shift that toISOString() introduces. */
function toDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Every occurrence of a weekday from (today - months) through today. */
function weekdayDatesInRange(dayIndex: number, months: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  cursor.setMonth(cursor.getMonth() - months);
  cursor.setDate(cursor.getDate() + ((dayIndex - cursor.getDay() + 7) % 7));

  const dates: string[] = [];
  while (cursor <= today) {
    dates.push(toDateStr(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

function byLastName(a: Member, b: Member): number {
  return (a.last_name || '').localeCompare(b.last_name || '')
    || (a.first_name || '').localeCompare(b.first_name || '');
}

/**
 * Buckets members by household or house church. Groups are alphabetical,
 * members within a group by last name, and members with no household / house
 * church land in one bucket at the end.
 */
function groupMembers(list: Member[], mode: 'household' | 'house_church', noneLabel: string): MemberGroup[] {
  const groups = new Map<string, MemberGroup>();
  const none: MemberGroup = { key: '__none__', label: noneLabel, real: false, members: [] };

  for (const m of list) {
    const key = mode === 'household' ? m.pco_household_id : m.house_church_id;
    const label = mode === 'household' ? m.household_name : m.house_church_name;
    if (!key) {
      none.members.push(m);
      continue;
    }
    if (!groups.has(key)) groups.set(key, { key, label: label || noneLabel, real: true, members: [] });
    groups.get(key)!.members.push(m);
  }

  const sorted = Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  if (none.members.length > 0) sorted.push(none);
  sorted.forEach(g => g.members.sort(byLastName));
  return sorted;
}

/** Sorts by attended/held; members with no held sessions always sort last. */
function sortByRate(list: Member[], rateOf: (id: string) => Rate, desc: boolean): Member[] {
  return [...list].sort((a, b) => {
    const ra = rateOf(a.id);
    const rb = rateOf(b.id);
    if (ra.held === 0 || rb.held === 0) {
      if (ra.held === rb.held) return byLastName(a, b);
      return ra.held === 0 ? 1 : -1;
    }
    const diff = ra.attended / ra.held - rb.attended / rb.held;
    if (diff !== 0) return desc ? -diff : diff;
    return byLastName(a, b);
  });
}

/** Attended/held per member from a history payload. */
function ratesFromHistory(h: HistoryData): (id: string) => Rate {
  const held = new Set(h.sessions);
  const attended = new Map<string, number>();
  for (const r of h.records) {
    if (held.has(r.date)) attended.set(r.member_id, (attended.get(r.member_id) || 0) + 1);
  }
  return (id: string) => ({ attended: attended.get(id) || 0, held: held.size });
}

/** Checkbox that can show the indeterminate (some-checked) state. */
function TriStateCheckbox({ checked, indeterminate, onChange, title }: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  title?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      title={title}
      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
    />
  );
}

const noteStyle = { color: 'var(--text-tertiary)', marginLeft: '8px', fontSize: '13px' };
const groupHeaderStyle = {
  display: 'flex', alignItems: 'center', gap: '12px',
  padding: '12px 0 6px', fontWeight: 600, fontSize: '13px',
  color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)',
};

export default function AttendancePage() {
  const { t } = useLang();
  const { data: authSession } = useSession();
  const userRole = (authSession?.user as { role?: string })?.role;

  const today = new Date().toISOString().split('T')[0];
  const [tab, setTab] = useState<'record' | 'view'>('record');
  const [eventType, setEventType] = useState('sunday_service');
  const [date, setDate] = useState(today);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [churches, setChurches] = useState<HouseChurch[]>([]);
  const [selectedHcId, setSelectedHcId] = useState<string>('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [showMinors, setShowMinors] = useState(false);
  const [loading, setLoading] = useState(true);

  // Record tab: grouping, rate-sort history cache, note editing
  const [recordGroup, setRecordGroup] = useState<GroupMode>('alpha');
  const [rateCache, setRateCache] = useState<Record<string, HistoryData>>({});
  const rateInFlight = useRef<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // View tab state
  const [viewType, setViewType] = useState('sunday_service');
  const [months, setMonths] = useState(2);
  const [viewHcId, setViewHcId] = useState('');
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [myHcIds, setMyHcIds] = useState<string[]>([]);
  const [myHcLoaded, setMyHcLoaded] = useState(false);
  const [viewGroup, setViewGroup] = useState<GroupMode>('alpha');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [viewReload, setViewReload] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then(r => r.json()),
      fetch('/api/house-churches').then(r => r.json()),
    ]).then(([memData, hcData]) => {
      const mems = memData.members || [];
      setAllMembers(mems);
      setChurches(hcData.churches || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Pre-load existing attendance when date, event type, or HC changes
  useEffect(() => {
    if (!date || !eventType || allMembers.length === 0) return;

    const initial: Record<string, boolean> = {};
    allMembers.forEach(m => { initial[m.id] = false; });

    const params = new URLSearchParams({ date, attendance_type: eventType });
    if (eventType === 'house_church' && selectedHcId) {
      params.set('house_church_id', selectedHcId);
    }

    fetch(`/api/attendance/existing?${params}`)
      .then(r => r.json())
      .then(data => {
        const updated = { ...initial };
        (data.present_member_ids || []).forEach((id: string) => {
          updated[id] = true;
        });
        setAttendance(updated);
      })
      .catch(() => setAttendance(initial));
  }, [date, eventType, selectedHcId, allMembers.length]);

  // Record tab rate sorts need history; fetch once per event type + HC.
  const recordHcId = eventType === 'house_church' ? selectedHcId : '';
  const rateKey = `${eventType}|${recordHcId}`;
  const recordRateSort = recordGroup === 'rate_desc' || recordGroup === 'rate_asc';
  useEffect(() => {
    if (!recordRateSort) return;
    if (rateCache[rateKey] || rateInFlight.current.has(rateKey)) return;

    rateInFlight.current.add(rateKey);
    const params = new URLSearchParams({ attendance_type: eventType, months: '2' });
    if (recordHcId) params.set('house_church_id', recordHcId);

    fetch(`/api/attendance/history?${params}`)
      .then(r => r.json())
      .then(data => {
        setRateCache(prev => ({
          ...prev,
          [rateKey]: {
            sessions: data.sessions || [],
            meeting_day: data.meeting_day ?? null,
            records: data.records || [],
          },
        }));
      })
      .catch(() => {})
      .finally(() => { rateInFlight.current.delete(rateKey); });
  }, [recordRateSort, rateKey, eventType, recordHcId, rateCache]);

  // A house church must be selected to view its history — meeting days differ
  // between house churches, so there is no meaningful "all" column set.
  useEffect(() => {
    if (viewType !== 'house_church' || viewHcId || churches.length === 0) return;
    if (!myHcLoaded) return;
    const mine = churches.find(c => myHcIds.includes(c.id));
    setViewHcId(mine ? mine.id : churches[0].id);
  }, [viewType, viewHcId, churches, myHcIds, myHcLoaded]);

  // Load history and the recorded-sessions list for the View tab
  useEffect(() => {
    if (tab !== 'view') return;
    if (viewType === 'house_church' && !viewHcId) return;

    let cancelled = false;
    setViewLoading(true);

    const params = new URLSearchParams({
      attendance_type: viewType,
      months: String(months),
    });
    if (viewType === 'house_church' && viewHcId) {
      params.set('house_church_id', viewHcId);
    }

    fetch(`/api/attendance/sessions?${params}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setSessions(data.sessions || []); })
      .catch(() => { if (!cancelled) setSessions([]); });

    fetch(`/api/attendance/history?${params}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setHistory({
          sessions: data.sessions || [],
          meeting_day: data.meeting_day ?? null,
          records: data.records || [],
        });
        setMyHcIds(data.my_house_church_ids || []);
      })
      .catch(() => {
        if (!cancelled) setHistory({ sessions: [], meeting_day: null, records: [] });
      })
      .finally(() => {
        if (cancelled) return;
        setViewLoading(false);
        setMyHcLoaded(true);
      });

    return () => { cancelled = true; };
  }, [tab, viewType, months, viewHcId, viewReload]);

  const hideMinor = (m: Member) => {
    if (showMinors || !m.date_of_birth) return false;
    const age = calcAge(m.date_of_birth);
    return age !== null && age < 18;
  };

  // Filter members: by HC when applicable, and by minors toggle
  const members = allMembers.filter(m => {
    if (eventType === 'house_church' && selectedHcId && m.house_church_id !== selectedHcId) return false;
    return !hideMinor(m);
  });

  const presentCount = members.filter(m => attendance[m.id]).length;
  const totalCount = members.length;

  const toggleMember = (id: string) => {
    setAttendance((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /** Checks every member of a group, or unchecks them all if already all checked. */
  const toggleGroup = (group: Member[]) => {
    const allChecked = group.every(m => attendance[m.id]);
    setAttendance(prev => {
      const next = { ...prev };
      group.forEach(m => { next[m.id] = !allChecked; });
      return next;
    });
  };

  const startNoteEdit = (m: Member) => {
    setEditingNoteId(m.id);
    setNoteDraft(m.attendance_note || '');
  };

  const saveNote = async (memberId: string) => {
    setNoteSaving(true);
    try {
      const res = await fetch(`/api/members/${memberId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_note: noteDraft }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(t('att.noteError') + (data.error ? ': ' + data.error : ''));
        return;
      }
      setAllMembers(prev => prev.map(m =>
        m.id === memberId ? { ...m, attendance_note: data.attendance_note ?? null } : m
      ));
      setEditingNoteId(null);
    } catch {
      alert(t('att.noteError'));
    } finally {
      setNoteSaving(false);
    }
  };

  const handleSave = async () => {
    const records = members.map((m) => ({
      member_id: m.id,
      present: attendance[m.id] ?? false,
    }));

    const hcId = eventType === 'house_church' ? selectedHcId || null : null;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          attendance_type: eventType,
          house_church_id: hcId,
          records,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        const msg = t('att.saved')
          .replace('{present}', String(resData.count ?? presentCount))
          .replace('{total}', String(totalCount));
        alert(msg);
        // Saved attendance changes the rates the Record tab sorts by
        setRateCache(prev => {
          const next = { ...prev };
          delete next[rateKey];
          return next;
        });
      } else {
        console.error('[Attendance] Save error:', resData);
        alert(t('att.saveError') + (resData.error ? ': ' + resData.error : ''));
      }
    } catch {
      alert(t('att.saveError'));
    }
  };

  // --- Record tab ordering ---
  const recordGroups: MemberGroup[] | null =
    recordGroup === 'household'
      ? groupMembers(members, 'household', t('att.noHousehold'))
      : recordGroup === 'house_church'
        ? groupMembers(members, 'house_church', t('att.noHouseChurch'))
        : null;

  const recordRateHistory = rateCache[rateKey];
  const recordSorted: Member[] = recordGroups
    ? []
    : recordRateSort && recordRateHistory
      ? sortByRate(members, ratesFromHistory(recordRateHistory), recordGroup === 'rate_desc')
      : [...members].sort(byLastName);

  // --- View tab derived data ---
  const viewMembers = allMembers.filter(m => {
    if (viewType === 'house_church' && m.house_church_id !== viewHcId) return false;
    return !hideMinor(m);
  });

  const sessionSet = new Set(history?.sessions || []);
  const presentSet = new Set((history?.records || []).map(r => `${r.member_id}|${r.date}`));

  const meetingDayIndex = history?.meeting_day ? DAY_INDEX[history.meeting_day] : undefined;
  const expectedDates =
    viewType === 'sunday_service'
      ? weekdayDatesInRange(0, months)
      : meetingDayIndex !== undefined
        ? weekdayDatesInRange(meetingDayIndex, months)
        : [];

  // Union expected meeting dates with recorded sessions, so off-schedule
  // gatherings still get a column.
  const columns = Array.from(new Set([...expectedDates, ...(history?.sessions || [])])).sort();
  const heldDates = columns.filter(d => sessionSet.has(d));

  const presentOn = (memberId: string, d: string) => presentSet.has(`${memberId}|${d}`);
  const countForDate = (d: string) =>
    sessionSet.has(d) ? viewMembers.filter(m => presentOn(m.id, d)).length : null;

  const rateParts = (memberId: string): Rate => ({
    attended: heldDates.filter(d => presentOn(memberId, d)).length,
    held: heldDates.length,
  });

  const rateFor = (memberId: string) => {
    const { attended, held } = rateParts(memberId);
    return `${attended}/${held}`;
  };

  const viewGroups: MemberGroup[] =
    viewGroup === 'household'
      ? groupMembers(viewMembers, 'household', t('att.noHousehold'))
      : viewGroup === 'house_church'
        ? groupMembers(viewMembers, 'house_church', t('att.noHouseChurch'))
        : [{
            key: '__all__',
            label: '',
            real: false,
            members: viewGroup === 'alpha'
              ? [...viewMembers].sort(byLastName)
              : sortByRate(viewMembers, rateParts, viewGroup === 'rate_desc'),
          }];
  const viewGrouped = viewGroup === 'household' || viewGroup === 'house_church';

  const showNoMeetingDay =
    viewType === 'house_church' && !!viewHcId && !viewLoading && !!history && !history.meeting_day;

  const dayMonth = (d: string) => {
    const [, mm, dd] = d.split('-');
    return `${dd}/${mm}`;
  };

  const canDeleteSession = (s: SessionRow) =>
    userRole === 'admin'
    || (userRole === 'house_church_pastor'
      && s.attendance_type === 'house_church'
      && !!s.house_church_id
      && myHcIds.includes(s.house_church_id));

  const editSession = (s: SessionRow) => {
    setEventType(s.attendance_type);
    setSelectedHcId(s.house_church_id || '');
    setDate(s.date);
    setTab('record');
  };

  const deleteSession = async (s: SessionRow) => {
    if (!confirm(t('att.deleteConfirm'))) return;
    try {
      const res = await fetch('/api/attendance/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: s.date,
          attendance_type: s.attendance_type,
          house_church_id: s.house_church_id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(t('att.deleteError') + (data.error ? ': ' + data.error : ''));
        return;
      }
      setRateCache({});
      setViewReload(n => n + 1);
    } catch {
      alert(t('att.deleteError'));
    }
  };

  const groupSelect = (id: string, value: GroupMode, onChange: (v: GroupMode) => void) => (
    <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
      <label htmlFor={id}>{t('att.groupBy')}</label>
      <select
        id={id}
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value as GroupMode)}
      >
        <option value="alpha">{t('att.groupAlpha')}</option>
        <option value="household">{t('att.groupHousehold')}</option>
        <option value="house_church">{t('att.groupHouseChurch')}</option>
        <option value="rate_desc">{t('att.groupRateDesc')}</option>
        <option value="rate_asc">{t('att.groupRateAsc')}</option>
      </select>
    </div>
  );

  const renderRecordRow = (member: Member) => (
    <div
      key={member.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer', minWidth: 0 }}>
        <input
          type="checkbox"
          checked={attendance[member.id] ?? false}
          onChange={() => toggleMember(member.id)}
          style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', flexShrink: 0 }}
        />
        <span>
          {member.first_name} {member.last_name}
          {member.house_church_name && (
            <span style={noteStyle}>— {member.house_church_name}</span>
          )}
          {member.attendance_note && editingNoteId !== member.id && (
            <span style={noteStyle}>· {member.attendance_note}</span>
          )}
        </span>
      </label>

      {editingNoteId === member.id ? (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            value={noteDraft}
            maxLength={120}
            placeholder={t('att.notePlaceholder')}
            autoFocus
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveNote(member.id);
              if (e.key === 'Escape') setEditingNoteId(null);
            }}
            style={{ width: '180px', padding: '4px 8px', fontSize: '13px' }}
          />
          <button className="btn btn-primary" disabled={noteSaving} onClick={() => saveNote(member.id)}>
            {t('common.save')}
          </button>
          <button className="btn btn-ghost" disabled={noteSaving} onClick={() => setEditingNoteId(null)}>
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          title={t('att.editNote')}
          aria-label={t('att.editNote')}
          onClick={(e) => { e.stopPropagation(); startNoteEdit(member); }}
          style={{ padding: '2px 6px', fontSize: '14px' }}
        >
          ✏️
        </button>
      )}
    </div>
  );

  const renderNameWithNote = (m: Member) => (
    <>
      {m.first_name} {m.last_name}
      {m.attendance_note && (
        <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 400 }}>
          {m.attendance_note}
        </div>
      )}
    </>
  );

  return (
    <div>
      <div className="page-header">
        <h2>{t('att.title')}</h2>
        <p>{t('att.sub')}</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn ${tab === 'record' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('record')}
        >
          {t('att.tabRecord')}
        </button>
        <button
          className={`btn ${tab === 'view' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setTab('view')}
        >
          {t('att.tabView')}
        </button>
      </div>

      {tab === 'record' ? (
        <>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('att.eventType')}</h3>
            </div>

            <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label htmlFor="att-event-type">{t('att.eventType')}</label>
                <select
                  id="att-event-type"
                  className="form-input"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="sunday_service">{t('att.sundayService')}</option>
                  <option value="house_church">{t('att.houseChurch')}</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label htmlFor="att-date">{t('att.date')}</label>
                <input
                  id="att-date"
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {groupSelect('att-record-group', recordGroup, setRecordGroup)}

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-end', paddingBottom: '8px' }}>
                <input type="checkbox" checked={showMinors} onChange={() => setShowMinors(!showMinors)} />
                {t('mem.showMinors')}
              </label>

              {eventType === 'house_church' && (
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label htmlFor="att-hc">{t('hc.title')}</label>
                  <select
                    id="att-hc"
                    className="form-input"
                    value={selectedHcId}
                    onChange={(e) => setSelectedHcId(e.target.value)}
                  >
                    <option value="">{t('hc.allCampuses')}</option>
                    {churches.map(hc => (
                      <option key={hc.id} value={hc.id}>{hc.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: '16px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">{t('att.members')}</h3>
              <span>{t('att.present')}: {presentCount} / {totalCount}</span>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {t('dashboard.loading')}
              </div>
            ) : members.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {t('common.noResults')}
              </div>
            ) : recordGroups ? (
              <div style={{ padding: '8px 16px' }}>
                {recordGroups.map(g => {
                  const checkedCount = g.members.filter(m => attendance[m.id]).length;
                  const showGroupCheckbox = recordGroup === 'household' && g.real;
                  return (
                    <div key={g.key}>
                      <div style={groupHeaderStyle}>
                        {showGroupCheckbox && (
                          <TriStateCheckbox
                            checked={checkedCount === g.members.length}
                            indeterminate={checkedCount > 0 && checkedCount < g.members.length}
                            onChange={() => toggleGroup(g.members)}
                            title={g.label}
                          />
                        )}
                        <span>{g.label} ({g.members.length})</span>
                      </div>
                      {g.members.map(renderRecordRow)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '8px 16px' }}>
                {recordSorted.map(renderRecordRow)}
              </div>
            )}

            <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={members.length === 0}>
                {t('att.save')}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label htmlFor="att-view-type">{t('att.eventType')}</label>
                <select
                  id="att-view-type"
                  className="form-input"
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value)}
                >
                  <option value="sunday_service">{t('att.sundayService')}</option>
                  <option value="house_church">{t('att.houseChurch')}</option>
                </select>
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label htmlFor="att-view-range">{t('att.range')}</label>
                <select
                  id="att-view-range"
                  className="form-input"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                >
                  <option value={1}>{t('att.months1')}</option>
                  <option value={2}>{t('att.months2')}</option>
                  <option value={3}>{t('att.months3')}</option>
                  <option value={4}>{t('att.months4')}</option>
                </select>
              </div>

              {viewType === 'house_church' && (
                <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                  <label htmlFor="att-view-hc">{t('hc.title')}</label>
                  <select
                    id="att-view-hc"
                    className="form-input"
                    value={viewHcId}
                    onChange={(e) => setViewHcId(e.target.value)}
                  >
                    <option value="">{t('att.selectHc')}</option>
                    {churches.map(hc => (
                      <option key={hc.id} value={hc.id}>{hc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {groupSelect('att-view-group', viewGroup, setViewGroup)}

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-end', paddingBottom: '8px' }}>
                <input type="checkbox" checked={showMinors} onChange={() => setShowMinors(!showMinors)} />
                {t('mem.showMinors')}
              </label>
            </div>

            {showNoMeetingDay && (
              <div style={{ padding: '0 16px 16px', fontSize: '13px', color: 'var(--text-tertiary)' }}>
                {t('att.noMeetingDay')}
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '16px' }}>
            {viewType === 'house_church' && !viewHcId ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {t('att.selectHc')}
              </div>
            ) : viewLoading || !history ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {t('dashboard.loading')}
              </div>
            ) : sessionSet.size === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {t('att.noHistory')}
              </div>
            ) : viewMembers.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {t('common.noResults')}
              </div>
            ) : (
              <>
                <div className="att-grid-wrap">
                  <table className="att-grid">
                    <thead>
                      <tr>
                        <th className="att-name-col">{t('common.name')}</th>
                        {columns.map(d => (
                          <th key={d}>
                            {dayMonth(d)}
                            <span className="att-date-count">{countForDate(d) ?? ''}</span>
                          </th>
                        ))}
                        <th>{t('att.rate')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewGroups.flatMap(g => [
                        ...(viewGrouped ? [
                          <tr key={`group-${g.key}`}>
                            <td
                              colSpan={columns.length + 2}
                              style={{ textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--surface-hover)' }}
                            >
                              {g.label} ({g.members.length})
                            </td>
                          </tr>,
                        ] : []),
                        ...g.members.map(m => (
                          <tr key={m.id}>
                            <td className="att-name-col">{renderNameWithNote(m)}</td>
                            {columns.map(d => {
                              if (!sessionSet.has(d)) return <td key={d} />;
                              const present = presentOn(m.id, d);
                              return (
                                <td key={d}>
                                  <span className={`att-mark ${present ? 'att-mark-present' : 'att-mark-absent'}`}>
                                    {present ? '✓' : '✗'}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="att-rate-col">{rateFor(m.id)}</td>
                          </tr>
                        )),
                      ])}
                    </tbody>
                  </table>
                </div>

                <div className="att-mobile-cards" style={{ padding: '12px 16px' }}>
                  {viewGroups.map(g => (
                    <div key={g.key}>
                      {viewGrouped && (
                        <div style={{ ...groupHeaderStyle, borderBottom: 'none', padding: '8px 0 6px' }}>
                          {g.label} ({g.members.length})
                        </div>
                      )}
                      {g.members.map(m => (
                        <div key={m.id} className="att-mobile-card">
                          <div className="att-mobile-card-head">
                            <span style={{ fontWeight: 600 }}>{renderNameWithNote(m)}</span>
                            <span className="att-rate-col" style={{ fontSize: '13px' }}>{rateFor(m.id)}</span>
                          </div>
                          <div className="att-mobile-dots">
                            {columns.map(d => {
                              const cls = !sessionSet.has(d)
                                ? 'att-dot-none'
                                : presentOn(m.id, d) ? 'att-dot-present' : 'att-dot-absent';
                              return <span key={d} className={`att-dot ${cls}`} title={dayMonth(d)} />;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {!(viewType === 'house_church' && !viewHcId) && !viewLoading && sessions.length > 0 && (
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="card-header">
                <h3 className="card-title">{t('att.sessions')}</h3>
              </div>
              <div style={{ padding: '8px 16px' }}>
                {sessions.map(s => (
                  <div
                    key={`${s.date}|${s.attendance_type}|${s.house_church_id ?? ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                      padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '14px',
                    }}
                  >
                    <span style={{ fontWeight: 600, minWidth: '90px' }}>{s.date}</span>
                    <span style={{ flex: 1, minWidth: '140px' }}>
                      {s.attendance_type === 'sunday_service'
                        ? t('att.sundayService')
                        : s.house_church_name || t('att.houseChurch')}
                      <span style={noteStyle}>
                        {t('att.present')}: {s.present_count}
                        {s.recorded_by_name && ` · ${t('att.recordedBy')} ${s.recorded_by_name}`}
                      </span>
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost" onClick={() => editSession(s)}>
                        {t('att.edit')}
                      </button>
                      {canDeleteSession(s) && (
                        <button className="btn btn-danger" onClick={() => deleteSession(s)}>
                          {t('att.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
