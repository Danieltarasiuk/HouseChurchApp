'use client';

import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { MOCK_CHURCHES, MOCK_MEMBERS, HouseChurch } from '@/data/mock-data';

const loc = (obj: { en: string; es: string }, lang: string) =>
  obj[lang as 'en' | 'es'] || obj.en;

const roleLabel = (role: string, t: (k: string) => string) =>
  t('role.' + role) || role.replace(/_/g, ' ');

export default function HouseChurchesPage() {
  const { t, language } = useLang();
  const [selected, setSelected] = useState<HouseChurch | null>(null);

  const membersForChurch = selected
    ? MOCK_MEMBERS.filter((m) => m.house_church_id === selected.id)
    : [];

  /* ---------- Detail view ---------- */
  if (selected) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>
            ← {t('hc.back')}
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">{selected.name}</h2>
          </div>

          <p>{loc(selected.description, language)}</p>

          <div className="hc-card-meta" style={{ marginTop: '12px' }}>
            <span>
              <strong>{t('hc.meetingTime')}:</strong>{' '}
              {loc(selected.meeting_day, language)} @ {selected.meeting_time}
            </span>
            <span>
              <strong>{t('hc.location')}:</strong> {selected.location}
            </span>
            <span>
              <strong>{t('hc.pastor')}:</strong> {selected.pastor_name}
            </span>
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3 className="card-title">
              {t('hc.members')} ({membersForChurch.length})
            </h3>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('auth.email')}</th>
                  <th>{t('hc.phone')}</th>
                  <th>{t('hc.role')}</th>
                </tr>
              </thead>
              <tbody>
                {membersForChurch.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.first_name} {m.last_name}
                    </td>
                    <td>{m.email}</td>
                    <td>{m.phone || '—'}</td>
                    <td>
                      <span
                        className={`badge ${
                          m.role === 'house_church_pastor'
                            ? 'badge-pastor'
                            : 'badge-member'
                        }`}
                      >
                        {roleLabel(m.role, t)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Grid view ---------- */
  return (
    <div>
      <div className="page-header">
        <h2>{t('hc.title')}</h2>
        <p>{t('hc.sub')}</p>
      </div>

      <div className="hc-grid">
        {MOCK_CHURCHES.map((church) => (
          <div
            key={church.id}
            className="hc-card"
            role="button"
            tabIndex={0}
            onClick={() => setSelected(church)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(church); } }}
          >
            <div className="hc-card-top">
              <h3>{church.name}</h3>
              <span className="badge badge-member">
                {church.member_count} {t('hc.members')}
              </span>
            </div>

            <p>{loc(church.description, language)}</p>

            <div className="hc-card-meta">
              <span>
                <strong>{t('hc.pastor')}:</strong> {church.pastor_name}
              </span>
              <span>
                {loc(church.meeting_day, language)} @ {church.meeting_time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
