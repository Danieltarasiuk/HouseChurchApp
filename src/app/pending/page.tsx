'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Clock } from 'lucide-react';
import { useLang } from '@/context/LangContext';

/**
 * Where middleware sends an email/password account that an admin has not
 * approved yet. Shows nothing from the app; every API refuses such accounts.
 */
export default function PendingPage() {
  const { t, language, setLanguage } = useLang();
  const { data: session, update } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);

  const status = (session?.user as { status?: string } | undefined)?.status;

  // Already active (approved, or never pending): go to the app.
  useEffect(() => {
    if (status === 'active') router.replace('/dashboard');
  }, [status, router]);

  const checkAgain = async () => {
    setChecking(true);
    setStillPending(false);
    // Forces the session to re-read the account's status from the database.
    const next = await update();
    setChecking(false);
    if ((next?.user as { status?: string } | undefined)?.status === 'active') router.replace('/dashboard');
    else setStillPending(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--bg)' }}>
      <div className="card card-padded" style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
          {(['en', 'es'] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={`btn ${language === l ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '2px 10px', fontSize: '12px' }}
              onClick={() => setLanguage(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <Clock size={40} style={{ color: 'var(--text-tertiary)', margin: '8px 0 12px' }} />
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{t('pending.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }} role="status">{t('pending.body')}</p>
        {session?.user?.email && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '12px' }}>
            {t('pending.signedInAs').replace('{email}', session.user.email)}
          </p>
        )}
        {stillPending && <p style={{ fontSize: '13px', marginTop: '12px' }}>{t('pending.stillPending')}</p>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={checkAgain} disabled={checking}>
            {t('pending.check')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => signOut({ callbackUrl: '/login' })}>
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
