'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';

interface DashboardData {
  churchCount: number;
  memberCount: number;
  prayerCount: number;
  recentPrayers: { id: string; title: string; status: string; created_at: string; requester_name: string | null }[];
}

export default function DashboardPage() {
  const { t } = useLang();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/dashboard', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(true);
          setData({ churchCount: 0, memberCount: 0, prayerCount: 0, recentPrayers: [] });
        }
      });

    return () => controller.abort();
  }, []);

  const loading = data === null;

  return (
    <div>
      <div className="page-header">
        <h2>{t('dashboard.welcome')}</h2>
        <p>{t('dashboard.sub')}</p>
      </div>

      {error && (
        <div role="alert" style={{
          marginBottom: '16px',
          padding: '12px',
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--danger)',
          fontSize: '14px',
        }}>
          {t('dashboard.error')}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.activeChurches')}</div>
          <div className="stat-value">{loading ? '—' : data.churchCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.totalMembers')}</div>
          <div className="stat-value">{loading ? '—' : data.memberCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.activePrayers')}</div>
          <div className="stat-value">{loading ? '—' : data.prayerCount}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">{t('dashboard.recentPrayers')}</h3>
        </div>
        <div className="card-body">
          {loading ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
              {t('dashboard.loading')}
            </div>
          ) : data.recentPrayers.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
              {t('pray.noRequests')}
            </div>
          ) : (
            data.recentPrayers.map((prayer) => (
              <div key={prayer.id} className="card-row">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{prayer.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {prayer.requester_name || t('dashboard.anonymous')} &middot; {prayer.created_at?.slice(0, 10)}
                  </div>
                </div>
                <span className={`badge ${prayer.status === 'active' ? 'badge-active' : 'badge-answered'}`}>
                  {prayer.status === 'active' ? t('pray.active') : t('pray.answered')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
