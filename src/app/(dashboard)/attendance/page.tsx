'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  house_church_id: string | null;
  house_church_name: string | null;
}

interface HouseChurch {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const { t } = useLang();

  const today = new Date().toISOString().split('T')[0];
  const [eventType, setEventType] = useState('sunday_service');
  const [date, setDate] = useState(today);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [churches, setChurches] = useState<HouseChurch[]>([]);
  const [selectedHcId, setSelectedHcId] = useState<string>('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then(r => r.json()),
      fetch('/api/house-churches').then(r => r.json()),
    ]).then(([memData, hcData]) => {
      const mems = memData.members || [];
      setAllMembers(mems);
      setChurches(hcData.churches || []);
      const initial: Record<string, boolean> = {};
      mems.forEach((m: Member) => { initial[m.id] = false; });
      setAttendance(initial);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter members: for HC attendance, show only members of selected HC
  const members = eventType === 'house_church' && selectedHcId
    ? allMembers.filter(m => m.house_church_id === selectedHcId)
    : allMembers;

  const presentCount = Object.values(attendance).filter(Boolean).length;
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

      if (res.ok) {
        const msg = t('att.saved')
          .replace('{present}', String(presentCount))
          .replace('{total}', String(totalCount));
        alert(msg);
      } else {
        alert(t('att.saveError'));
      }
    } catch {
      alert(t('att.saveError'));
    }
  };

  const resetAttendance = () => {
    const initial: Record<string, boolean> = {};
    allMembers.forEach((m) => { initial[m.id] = false; });
    setAttendance(initial);
  };

  const handleEventTypeChange = (value: string) => {
    setEventType(value);
    resetAttendance();
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    resetAttendance();
  };

  return (
    <div>
      <div className="page-header">
        <h2>{t('att.title')}</h2>
        <p>{t('att.sub')}</p>
      </div>

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
              onChange={(e) => handleEventTypeChange(e.target.value)}
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
              onChange={(e) => handleDateChange(e.target.value)}
            />
          </div>

          {eventType === 'house_church' && (
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label htmlFor="att-hc">{t('hc.title')}</label>
              <select
                id="att-hc"
                className="form-input"
                value={selectedHcId}
                onChange={(e) => { setSelectedHcId(e.target.value); resetAttendance(); }}
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
    </div>
  );
}
