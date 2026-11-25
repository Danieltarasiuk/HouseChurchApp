'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { PrivacyControls } from '@/components/PrivacyControls';

export default function ProfilePage() {
  const { t } = useLang();
  const { data: session } = useSession();
  const [memberId, setMemberId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((me) => setMemberId(me.memberId ?? null))
      .catch(() => setMemberId(null));
  }, []);

  const roleKey = (session?.user as { role?: string })?.role;

  return (
    <div>
      <div className="page-header">
        <h2>{t('profile.title')}</h2>
        <p>{t('profile.sub')}</p>
      </div>

      <div className="card card-padded" style={{ marginBottom: '24px' }}>
        <div style={{ fontWeight: 600 }}>{session?.user?.name}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{session?.user?.email}</div>
        {roleKey && <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px' }}>{t('role.' + roleKey)}</div>}
      </div>

      <div className="card card-padded">
        {memberId === undefined ? (
          <p style={{ color: 'var(--text-tertiary)' }}>{t('dashboard.loading')}</p>
        ) : memberId === null ? (
          <>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{t('privacy.myTitle')}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{t('privacy.noMemberRecord')}</p>
          </>
        ) : (
          <PrivacyControls scope="member_self" title={t('privacy.myTitle')} description={t('privacy.myDesc')} />
        )}
      </div>
    </div>
  );
}
