'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';

interface HouseChurch {
  id: number;
  name: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  location: string;
  pastor_name: string;
  member_count: number;
}

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  house_church_id: number | null;
  house_church_name: string | null;
}

const roleLabel = (role: string, t: (k: string) => string) => {
  const translated = t('role.' + role);
  return translated.startsWith('role.') ? role.replace(/_/g, ' ') : translated;
};

export default function HouseChurchesPage() {
  const { t } = useLang();
  const [churches, setChurches] = useState<HouseChurch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<HouseChurch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/house-churches').then((r) => r.json()),
      fetch('/api/members').then((r) => r.json()),
    ])
      .then(([hcData, memData]) => {
        setChurches(hcData.churches || []);
        setMembers(memData.members || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const membersForChurch = selected
    ? members.filter((m) => m.house_church_id === selected.id)
    : [];

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>{t('hc.title')}</h2>
          <p>{t('hc.sub')}</p>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {t('dashboard.loading')}
        </div>
      </div>
    );
  }

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

          {selected.description && <p style={{ padding: '0 24px' }}>{selected.description}</p>}

          <div className="hc-card-meta" style={{ margin: '12px 24px' }}>
            {selected.meeting_day && (
              <span>
                <strong>{t('hc.meetingTime')}:</strong>{' '}
                {selected.meeting_day} @ {selected.meeting_time}
              </span>
            )}
            {selected.location && (
              <span>
                <strong>{t('hc.location')}:</strong> {selected.location}
              </span>
            )}
            {selected.pastor_name && (
              <span>
                <strong>{t('hc.pastor')}:</strong> {selected.pastor_name}
              </span>
            )}
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
                {membersForChurch.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      {t('common.noResults')}
                    </td>
                  </tr>
                ) : (
                  membersForChurch.map((m) => (
                    <tr key={m.id}>
                      <td>{m.first_name} {m.last_name}</td>
                      <td>{m.email}</td>
                      <td>{m.phone || '—'}</td>
                      <td>
                        <span className={`badge ${m.role === 'house_church_pastor' ? 'badge-pastor' : 'badge-member'}`}>
                          {roleLabel(m.role, t)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
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

      {churches.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('common.noResults')}</p>
        </div>
      ) : (
        <div className="hc-grid">
          {churches.map((church) => (
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

              {church.description && <p>{church.description}</p>}

              <div className="hc-card-meta">
                {church.pastor_name && (
                  <span>
                    <strong>{t('hc.pastor')}:</strong> {church.pastor_name}
                  </span>
                )}
                {church.meeting_day && (
                  <span>
                    {church.meeting_day} @ {church.meeting_time}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
