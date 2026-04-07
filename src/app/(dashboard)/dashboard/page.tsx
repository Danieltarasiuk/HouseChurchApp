'use client';

import { useLang } from '@/context/LangContext';

export default function DashboardPage() {
  const { t } = useLang();

  return (
    <div>
      <div className="page-header">
        <h2>{t('dashboard.welcome')}</h2>
        <p>Manage your house church network</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.activeChurches')}</div>
          <div className="stat-value">3</div>
          <div className="stat-change">+2 this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.totalMembers')}</div>
          <div className="stat-value">24</div>
          <div className="stat-change">+3 this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('dashboard.activeDiscipleships')}</div>
          <div className="stat-value">5</div>
          <div className="stat-change">Active 7&7s</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
        </div>
        <div className="card-body">
          <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>
            Activity feed coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}
