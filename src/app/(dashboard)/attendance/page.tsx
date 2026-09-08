'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  house_church_id: string | null;
  house_church_name: string | null;
  date_of_birth: string | null;
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

export default function AttendancePage() {
  const { t } = useLang();

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

  // View tab state
  const [viewType, setViewType] = useState('sunday_service');
  const [months, setMonths] = useState(2);
  const [viewHcId, setViewHcId] = useState('');
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [myHcIds, setMyHcIds] = useState<string[]>([]);
  const [myHcLoaded, setMyHcLoaded] = useState(false);

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

  // A house church must be selected to view its history — meeting days differ
  // between house churches, so there is no meaningful "all" column set.
  useEffect(() => {
    if (viewType !== 'house_church' || viewHcId || churches.length === 0) return;
    if (!myHcLoaded) return;
    const mine = churches.find(c => myHcIds.includes(c.id));
    setViewHcId(mine ? mine.id : churches[0].id);
  }, [viewType, viewHcId, churches, myHcIds, myHcLoaded]);

  // Load history for the View tab
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
  }, [tab, viewType, months, viewHcId]);

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
      } else {
        console.error('[Attendance] Save error:', resData);
        alert(t('att.saveError') + (resData.error ? ': ' + resData.error : ''));
      }
    } catch {
      alert(t('att.saveError'));
    }
  };

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

  const presentOn = (memberId: string, d: string) => presentSet.has(`${memberId}|${d}`);
  const countForDate = (d: string) =>
    sessionSet.has(d) ? viewMembers.filter(m => presentOn(m.id, d)).length : null;

  const rateFor = (memberId: string) => {
    const held = columns.filter(d => sessionSet.has(d));
    const attended = held.filter(d => presentOn(memberId, d)).length;
    return `${attended}/${held.length}`;
  };

  const showNoMeetingDay =
    viewType === 'house_church' && !!viewHcId && !viewLoading && !!history && !history.meeting_day;

  const dayMonth = (d: string) => {
    const [, mm, dd] = d.split('-');
    return `${dd}/${mm}`;
  };

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
            ) : (
              <div style={{ padding: '8px 16px' }}>
                {members.map((member) => (
                  <label
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={attendance[member.id] ?? false}
                      onChange={() => toggleMember(member.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <span>
                      {member.first_name} {member.last_name}
                      {member.house_church_name && (
                        <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px', fontSize: '13px' }}>
                          — {member.house_church_name}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
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
                      {viewMembers.map(m => (
                        <tr key={m.id}>
                          <td className="att-name-col">{m.first_name} {m.last_name}</td>
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
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="att-mobile-cards" style={{ padding: '12px 16px' }}>
                  {viewMembers.map(m => (
                    <div key={m.id} className="att-mobile-card">
                      <div className="att-mobile-card-head">
                        <span style={{ fontWeight: 600 }}>{m.first_name} {m.last_name}</span>
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
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
