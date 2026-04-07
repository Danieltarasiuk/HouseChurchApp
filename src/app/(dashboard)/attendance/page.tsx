'use client';

import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { MOCK_MEMBERS } from '@/data/mock-data';

function buildInitialAttendance(): Record<number, boolean> {
  const record: Record<number, boolean> = {};
  MOCK_MEMBERS.forEach((m) => {
    record[m.id] = false;
  });
  return record;
}

export default function AttendancePage() {
  const { t } = useLang();

  const today = new Date().toISOString().split('T')[0];
  const [eventType, setEventType] = useState('sunday_service');
  const [date, setDate] = useState(today);
  const [attendance, setAttendance] = useState<Record<number, boolean>>(buildInitialAttendance);

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = MOCK_MEMBERS.length;

  const toggleMember = (id: number) => {
    setAttendance((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    const msg = t('att.saved')
      .replace('{present}', String(presentCount))
      .replace('{total}', String(totalCount));
    alert(msg);
  };

  // Reset attendance when event type or date changes
  const handleEventTypeChange = (value: string) => {
    setEventType(value);
    setAttendance(buildInitialAttendance());
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setAttendance(buildInitialAttendance());
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
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">{t('att.members')}</h3>
          <span>{t('att.present')}: {presentCount} / {totalCount}</span>
        </div>

        <div style={{ padding: '8px 16px' }}>
          {MOCK_MEMBERS.map((member) => (
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

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            {t('att.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
