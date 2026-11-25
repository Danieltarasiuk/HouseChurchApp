'use client';

import { Shield } from 'lucide-react';
import { useLang } from '@/context/LangContext';

/** Shown when someone opens a page their role can't use. */
export function NoAccess() {
  const { t } = useLang();
  return (
    <div className="card card-padded" role="alert" style={{ textAlign: 'center', padding: '48px 24px' }}>
      <Shield size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '12px' }} />
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>{t('common.noAccessTitle')}</h3>
      <p style={{ color: 'var(--text-secondary)' }}>{t('common.noAccess')}</p>
    </div>
  );
}
