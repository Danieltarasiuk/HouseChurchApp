'use client';

import { useLang } from '@/context/LangContext';

export default function PrayerPage() {
  const { t } = useLang();

  return (
    <div>
      <div className="page-header">
        <h2>{t('nav.prayer')}</h2>
        <p>Prayer requests and intercession</p>
      </div>

      <div className="card card-padded">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            marginBottom: '8px',
          }}>
            {t('coming.soon')}
          </h3>
          <p style={{ color: 'var(--text-tertiary)' }}>
            Prayer request features will be available soon
          </p>
        </div>
      </div>
    </div>
  );
}
