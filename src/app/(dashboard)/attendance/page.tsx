'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { formatDate, formatNumericMonthDay } from '@/lib/formatDate';
import { NoAccess } from '@/components/NoAccess';
import { todayInChurchTz } from '@/lib/churchTime';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  group_id: string | null;
  group_name: string | null;
  date_of_birth: string | null;
  pco_household_id: string | null;
  household_name: string | null;
  attendance_note: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface HistoryData {
  sessions: string[];
  meeting_day: string | null;
  records: { member_id: string; date: string }[];
}

/**
 * History for the Record tab's rate sort. sessionScopes is set only for group
 * attendance across all groups, so each member can be scored against
 * their own group's sessions rather than every group's meeting dates.
 */
interface RateHistory extends HistoryData {
  sessionScopes?: { date: string; group_id: string | null }[];
}

interface SessionRow {
  date: string;
  attendance_type: string;
  group_id: string | null;
  group_name: string | null;
  recorded_by_name: string | null;
  present_count: number;
  adult_count?: number;
  kid_count?: number;
}

type GroupMode = 'household' | 'group' | 'alpha' | 'rate_desc' | 'rate_asc';

interface MemberGroup {
  key: string;
  label: string;
  /** False for the trailing "No household" / "No group" bucket. */
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
 * Buckets members by household or group. Groups are alphabetical,
 * members within a group by last name, and members with no household / group
 * land in one bucket at the end.
 */
function groupMembers(list: Member[], mode: 'household' | 'group', noneLabel: string): MemberGroup[] {
  const groups = new Map<string, MemberGroup>();
  const none: MemberGroup = { key: '__none__', label: noneLabel, real: false, members: [] };

  for (const m of list) {
    const key = mode === 'household' ? m.pco_household_id : m.group_id;
    const label = mode === 'household' ? m.household_name : m.group_name;
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
function ratesFromHistory(h: RateHistory, members: Member[]): (id: string) => Rate {
  if (h.sessionScopes) {
    // Held = sessions of the member's own group; attended = their
    // present records on those dates. No group → nothing held.
    const heldByGroup = new Map<string, Set<string>>();
    for (const s of h.sessionScopes) {
      if (!s.group_id) continue;
      if (!heldByGroup.has(s.group_id)) heldByGroup.set(s.group_id, new Set());
      heldByGroup.get(s.group_id)!.add(s.date);
    }
    const groupOf = new Map(members.map(m => [m.id, m.group_id]));
    const heldFor = (id: string) => {
      const hc = groupOf.get(id);
      return (hc && heldByGroup.get(hc)) || new Set<string>();
    };
    const attended = new Map<string, number>();
    for (const r of h.records) {
      if (heldFor(r.member_id).has(r.date)) {
        attended.set(r.member_id, (attended.get(r.member_id) || 0) + 1);
      }
    }
    return (id: string) => ({ attended: attended.get(id) || 0, held: heldFor(id).size });
  }

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
  const { t, language } = useLang();

  /** Check-Ins import failure, translated from the API's reason code. */
  const checkinsErrorMessage = (reason: string | undefined, status: number) => {
    if (reason === 'needs_reconnect') return t('att.checkinsNeedsReconnect');
    if (reason === 'event_not_found' || status === 404) return t('att.checkinsEventNotFound');
    const key = reason ? `settings.pcoReason.${reason}` : '';
    return key && t(key) !== key ? `${t('att.importKidsError')}: ${t(key)}` : t('att.importKidsError');
  };
  const { data: authSession } = useSession();
  const userRole = (authSession?.user as { role?: string })?.role;

  const today = todayInChurchTz(); // not toISOString(): that is already tomorrow on Sunday evenings
  const [tab, setTab] = useState<'record' | 'view'>('record');
  const [eventType, setEventType] = useState('sunday_service');
  const [date, setDate] = useState(today);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [showMinors, setShowMinors] = useState(false);
  const [importingKids, setImportingKids] = useState(false);
  const [loading, setLoading] = useState(true);

  // Record tab: grouping, rate-sort history cache, note editing
  const [recordGroup, setRecordGroup] = useState<GroupMode>('alpha');
  const [rateCache, setRateCache] = useState<Record<string, RateHistory>>({});
  const rateInFlight = useRef<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // View tab state
  const [viewType, setViewType] = useState('sunday_service');
  const [months, setMonths] = useState(2);
  const [viewGroupId, setViewGroupId] = useState('');
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [myGroupIds, setMyGroupIds] = useState<string[]>([]);
  const [myGroupsLoaded, setMyGroupsLoaded] = useState(false);
  const [viewGroup, setViewGroup] = useState<GroupMode>('alpha');
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [viewReload, setViewReload] = useState(0);

  const isLeader = userRole === 'admin' || userRole === 'group_leader';

  useEffect(() => {
    if (!isLeader) return;
    Promise.all([
      fetch('/api/members').then(r => r.json()),
      fetch('/api/groups').then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([memData, groupData, me]) => {
      let mems: Member[] = memData.members || [];
      let hcs: Group[] = groupData.groups || [];
      // Pastors record and view attendance for their own group only
      // (the API enforces this); list just their members and groups.
      if (me.role === 'group_leader') {
        const mine: string[] = me.ledGroupIds || [];
        mems = mems.filter(m => !!m.group_id && mine.includes(m.group_id));
        hcs = hcs.filter(hc => mine.includes(hc.id));
        if (hcs.length > 0) setSelectedGroupId(hcs[0].id);
      }
      setAllMembers(mems);
      setGroups(hcs);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [isLeader]);

  // Pre-load existing attendance when date, event type, or group changes
  useEffect(() => {
    if (!date || !eventType || allMembers.length === 0) return;

    const initial: Record<string, boolean> = {};
    allMembers.forEach(m => { initial[m.id] = false; });

    const params = new URLSearchParams({ date, attendance_type: eventType });
    if (eventType === 'group' && selectedGroupId) {
      params.set('group_id', selectedGroupId);
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
  }, [date, eventType, selectedGroupId, allMembers.length]);

  // Record tab rate sorts need history; fetch once per event type + group.
  const recordGroupId = eventType === 'group' ? selectedGroupId : '';
  const rateKey = `${eventType}|${recordGroupId}`;
  const recordRateSort = recordGroup === 'rate_desc' || recordGroup === 'rate_asc';
  useEffect(() => {
    if (!recordRateSort) return;
    if (rateCache[rateKey] || rateInFlight.current.has(rateKey)) return;

    rateInFlight.current.add(rateKey);
    const params = new URLSearchParams({ attendance_type: eventType, months: '2' });
    if (recordGroupId) params.set('group_id', recordGroupId);

    // Group with "All" selected: also fetch each session's group so
    // members are scored only against their own group's sessions.
    const needScopes = eventType === 'group' && !recordGroupId;

    Promise.all([
      fetch(`/api/attendance/history?${params}`).then(r => r.json()),
      needScopes
        ? fetch(`/api/attendance/sessions?${params}`).then(r => r.json())
        : Promise.resolve(null),
    ])
      .then(([data, scopeData]) => {
        setRateCache(prev => ({
          ...prev,
          [rateKey]: {
            sessions: data.sessions || [],
            meeting_day: data.meeting_day ?? null,
            records: data.records || [],
            ...(scopeData && {
              sessionScopes: ((scopeData.sessions || []) as SessionRow[]).map(s => ({
                date: s.date,
                group_id: s.group_id,
              })),
            }),
          },
        }));
      })
      .catch(() => {})
      .finally(() => { rateInFlight.current.delete(rateKey); });
  }, [recordRateSort, rateKey, eventType, recordGroupId, rateCache]);

  // A group must be selected to view its history — meeting days differ
  // between groups, so there is no meaningful "all" column set.
  useEffect(() => {
    if (viewType !== 'group' || viewGroupId || groups.length === 0) return;
    if (!myGroupsLoaded) return;
    const mine = groups.find(c => myGroupIds.includes(c.id));
    setViewGroupId(mine ? mine.id : groups[0].id);
  }, [viewType, viewGroupId, groups, myGroupIds, myGroupsLoaded]);

  // Load history and the recorded-sessions list for the View tab
  useEffect(() => {
    if (tab !== 'view') return;
    if (viewType === 'group' && !viewGroupId) return;

    let cancelled = false;
    setViewLoading(true);

    const params = new URLSearchParams({
      attendance_type: viewType,
      months: String(months),
    });
    if (viewType === 'group' && viewGroupId) {
      params.set('group_id', viewGroupId);
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
        setMyGroupIds(data.my_group_ids || []);
      })
      .catch(() => {
        if (!cancelled) setHistory({ sessions: [], meeting_day: null, records: [] });
      })
      .finally(() => {
        if (cancelled) return;
        setViewLoading(false);
        setMyGroupsLoaded(true);
      });

    return () => { cancelled = true; };
  }, [tab, viewType, months, viewGroupId, viewReload]);

  const hideMinor = (m: Member) => {
    if (showMinors || !m.date_of_birth) return false;
    const age = calcAge(m.date_of_birth);
    return age !== null && age < 18;
  };

  // Filter members: by group when applicable, and by minors toggle
  const members = allMembers.filter(m => {
    if (eventType === 'group' && selectedGroupId && m.group_id !== selectedGroupId) return false;
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
        alert(data.reason === 'too_long' ? t('att.noteTooLong').replace('{max}', String(data.max ?? 120)) : t('att.noteError'));
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

  /** Ticks everyone checked in to the Sunday event in PCO Check-Ins, plus whoever checked them in. */
  const importKidsFromCheckIn = async () => {
    setImportingKids(true);
    try {
      const res = await fetch(`/api/attendance/pco-checkins?date=${date}`);
      const data = await res.json();
      if (!res.ok) {
        alert(checkinsErrorMessage(data.reason, res.status));
        return;
      }
      const kidIds: string[] = data.kid_member_ids || [];
      const adultIds: string[] = data.adult_member_ids || [];
      const ids = [...kidIds, ...adultIds];
      if (ids.length === 0) {
        alert(t('att.importKidsNone'));
        return;
      }
      // Kids are hidden by default and only visible members get saved.
      setShowMinors(true);
      setAttendance(prev => {
        const next = { ...prev };
        ids.forEach(id => { next[id] = true; });
        return next;
      });
      alert(t('att.importKidsDone')
        .replace('{n}', String(kidIds.length))
        .replace('{a}', String(adultIds.length))
        .replace('{date}', formatDate(date, language)));
    } catch {
      alert(t('att.importKidsError'));
    } finally {
      setImportingKids(false);
    }
  };

  const handleSave = async () => {
    const records = members.map((m) => ({
      member_id: m.id,
      present: attendance[m.id] ?? false,
    }));

    const groupId = eventType === 'group' ? selectedGroupId || null : null;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          attendance_type: eventType,
          group_id: groupId,
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
      : recordGroup === 'group'
        ? groupMembers(members, 'group', t('att.noGroup'))
        : null;

  const recordRateHistory = rateCache[rateKey];
  const recordSorted: Member[] = recordGroups
    ? []
    : recordRateSort && recordRateHistory
      ? sortByRate(members, ratesFromHistory(recordRateHistory, members), recordGroup === 'rate_desc')
      : [...members].sort(byLastName);

  // --- View tab derived data ---
  const viewMembers = allMembers.filter(m => {
    if (viewType === 'group' && m.group_id !== viewGroupId) return false;
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

  // Per-date adult/kid split for the column headers. Counts the full view
  // scope, not the minors-filtered list, so the totals don't change with
  // the Show Minors toggle. Kid = under 18 on that session's date; no
  // birthday on file counts as adult.
  const scopeMembers = allMembers.filter(m =>
    viewType === 'group' ? m.group_id === viewGroupId : true
  );
  const isKidOn = (m: Member, d: string) => {
    if (!m.date_of_birth) return false;
    const birth = new Date(m.date_of_birth.split('T')[0] + 'T00:00:00');
    if (isNaN(birth.getTime())) return false;
    const ref = new Date(d + 'T00:00:00');
    let age = ref.getFullYear() - birth.getFullYear();
    const mm = ref.getMonth() - birth.getMonth();
    if (mm < 0 || (mm === 0 && ref.getDate() < birth.getDate())) age--;
    return age >= 0 && age < 18;
  };
  const splitForDate = (d: string) => {
    if (!sessionSet.has(d)) return null;
    let adults = 0, kids = 0;
    for (const m of scopeMembers) {
      if (!presentOn(m.id, d)) continue;
      if (isKidOn(m, d)) kids++; else adults++;
    }
    return { adults, kids };
  };
  const heldSplits = heldDates
    .map(d => splitForDate(d))
    .filter((x): x is { adults: number; kids: number } => x !== null);
  const avgHeader = heldSplits.length > 0
    ? {
        adults: heldSplits.reduce((sum, x) => sum + x.adults, 0) / heldSplits.length,
        kids: heldSplits.reduce((sum, x) => sum + x.kids, 0) / heldSplits.length,
      }
    : null;

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
      : viewGroup === 'group'
        ? groupMembers(viewMembers, 'group', t('att.noGroup'))
        : [{
            key: '__all__',
            label: '',
            real: false,
            members: viewGroup === 'alpha'
              ? [...viewMembers].sort(byLastName)
              : sortByRate(viewMembers, rateParts, viewGroup === 'rate_desc'),
          }];
  const viewGrouped = viewGroup === 'household' || viewGroup === 'group';

  const showNoMeetingDay =
    viewType === 'group' && !!viewGroupId && !viewLoading && !!history && !history.meeting_day;

  // Compact column header in the viewer's locale (11/30 in English, 30/11 in Spanish).
  const dayMonth = (d: string) => formatNumericMonthDay(d, language);

  // Rolling average per service over the sessions in the selected range
  const avgAdults = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + (s.adult_count ?? 0), 0) / sessions.length).toFixed(1)
    : '0';
  const avgKids = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + (s.kid_count ?? 0), 0) / sessions.length).toFixed(1)
    : '0';

  /**
   * One-click toggle of a single mark in the View grid. Optimistic: the
   * grid and the Recorded Sessions counts update immediately and revert
   * if the save fails. Reuses the roster POST with a one-member payload —
   * present inserts the row, absent deletes it; the session row exists.
   */
  const toggleViewMark = async (memberId: string, d: string) => {
    if (!history || !sessionSet.has(d)) return;
    const was = presentOn(memberId, d);
    const groupId = viewType === 'group' ? viewGroupId || null : null;

    const applyLocal = (present: boolean) => {
      setHistory(h => h && ({
        ...h,
        records: present
          ? [...h.records, { member_id: memberId, date: d }]
          : h.records.filter(r => !(r.member_id === memberId && r.date === d)),
      }));
      const m = allMembers.find(mm => mm.id === memberId);
      const kid = m ? isKidOn(m, d) : false;
      const delta = present ? 1 : -1;
      setSessions(prev => prev.map(sess => {
        if (sess.date !== d || sess.attendance_type !== viewType) return sess;
        if (viewType === 'group' && sess.group_id !== groupId) return sess;
        return {
          ...sess,
          present_count: sess.present_count + delta,
          adult_count: (sess.adult_count ?? 0) + (kid ? 0 : delta),
          kid_count: (sess.kid_count ?? 0) + (kid ? delta : 0),
        };
      }));
    };

    applyLocal(!was);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: d,
          attendance_type: viewType,
          group_id: groupId,
          records: [{ member_id: memberId, present: !was }],
        }),
      });
      if (!res.ok) throw new Error();
      // Saved attendance changes the rates the Record tab sorts by
      setRateCache({});
    } catch {
      applyLocal(was);
      alert(t('att.toggleError'));
    }
  };

  const canDeleteSession = (s: SessionRow) =>
    userRole === 'admin'
    || (userRole === 'group_leader'
      && s.attendance_type === 'group'
      && !!s.group_id
      && myGroupIds.includes(s.group_id));

  const editSession = (s: SessionRow) => {
    setEventType(s.attendance_type);
    setSelectedGroupId(s.group_id || '');
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
          group_id: s.group_id,
        }),
      });
      if (!res.ok) {
        alert(t('att.deleteError'));
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
        <option value="group">{t('att.groupByGroup')}</option>
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
          {member.group_name && (
            <span style={noteStyle}>— {member.group_name}</span>
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
        // span, not div: this renders inside a <span> in the mobile cards,
        // and a div inside a span is invalid HTML (hydration warnings).
        <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 400 }}>
          {m.attendance_note}
        </span>
      )}
    </>
  );

  if (authSession && !isLeader) {
    return (
      <div>
        <div className="page-header"><h2>{t('att.title')}</h2></div>
        <NoAccess />
      </div>
    );
  }

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
                  <option value="group">{t('att.group')}</option>
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

              {eventType === 'sunday_service' && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ alignSelf: 'flex-end', marginBottom: '4px' }}
                  onClick={importKidsFromCheckIn}
                  disabled={importingKids}
                >
                  {importingKids ? t('dashboard.loading') : t('att.importKids')}
                </button>
              )}

              {eventType === 'group' && (
                <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                  <label htmlFor="att-group">{t('group.title')}</label>
                  <select
                    id="att-group"
                    className="form-input"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    {userRole === 'admin' && <option value="">{t('group.allCampuses')}</option>}
                    {groups.map(hc => (
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
                  <option value="group">{t('att.group')}</option>
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

              {viewType === 'group' && (
                <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                  <label htmlFor="att-view-group">{t('group.title')}</label>
                  <select
                    id="att-view-group"
                    className="form-input"
                    value={viewGroupId}
                    onChange={(e) => setViewGroupId(e.target.value)}
                  >
                    <option value="">{t('att.selectGroup')}</option>
                    {groups.map(hc => (
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
            {viewType === 'group' && !viewGroupId ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {t('att.selectGroup')}
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
                        {columns.map(d => {
                          const split = splitForDate(d);
                          return (
                            <th key={d}>
                              {dayMonth(d)}
                              {split && (
                                <span className="att-date-count" style={{ display: 'block', fontWeight: 400 }}>
                                  {split.adults}{t('att.adultAbbr')} {split.kids}{t('att.kidAbbr')}
                                </span>
                              )}
                              <span className="att-date-count" style={{ display: 'block' }}>
                                {split ? `${split.adults + split.kids} ${t('att.total')}` : ''}
                              </span>
                            </th>
                          );
                        })}
                        <th title={avgHeader ? t('att.avgSplit')
                          .replace('{a}', avgHeader.adults.toFixed(1))
                          .replace('{k}', avgHeader.kids.toFixed(1)) : undefined}>
                          {t('att.rate')}
                          {avgHeader && (
                            <>
                              <span className="att-date-count" style={{ display: 'block', fontWeight: 400 }}>
                                {avgHeader.adults.toFixed(1)}{t('att.adultAbbr')} {avgHeader.kids.toFixed(1)}{t('att.kidAbbr')}
                              </span>
                              <span className="att-date-count" style={{ display: 'block' }}>
                                {(avgHeader.adults + avgHeader.kids).toFixed(1)} {t('att.total')}
                              </span>
                            </>
                          )}
                        </th>
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
                                  <span
                                    className={`att-mark ${present ? 'att-mark-present' : 'att-mark-absent'}`}
                                    role="button"
                                    tabIndex={0}
                                    title={t('att.clickToggle')}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => toggleViewMark(m.id, d)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleViewMark(m.id, d); } }}
                                  >
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
                              const held = sessionSet.has(d);
                              const cls = !held
                                ? 'att-dot-none'
                                : presentOn(m.id, d) ? 'att-dot-present' : 'att-dot-absent';
                              return (
                                <span
                                  key={d}
                                  className={`att-dot ${cls}`}
                                  title={dayMonth(d)}
                                  style={held ? { cursor: 'pointer' } : undefined}
                                  onClick={held ? () => toggleViewMark(m.id, d) : undefined}
                                />
                              );
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

          {!(viewType === 'group' && !viewGroupId) && !viewLoading && sessions.length > 0 && (
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3 className="card-title">{t('att.sessions')}</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {t('att.avgSplit').replace('{a}', avgAdults).replace('{k}', avgKids)}
                </span>
              </div>
              <div style={{ padding: '8px 16px' }}>
                {sessions.map(s => (
                  <div
                    key={`${s.date}|${s.attendance_type}|${s.group_id ?? ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                      padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '14px',
                    }}
                  >
                    <span style={{ fontWeight: 600, minWidth: '90px' }}>{formatDate(s.date, language)}</span>
                    <span style={{ flex: 1, minWidth: '140px' }}>
                      {s.attendance_type === 'sunday_service'
                        ? t('att.sundayService')
                        : s.group_name || t('att.group')}
                      <span style={noteStyle}>
                        {t('att.present')}: {s.present_count}
                        {s.adult_count != null && s.kid_count != null &&
                          ` (${s.adult_count} ${t('att.adultsShort')} / ${s.kid_count} ${t('att.kidsShort')})`}
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
