'use client';

import { useState } from 'react';
import { useLang } from '@/context/LangContext';

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
  suggested_member_id: string | null;
}

export interface LinkableMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  house_church_name: string | null;
}

const CREATE_NEW = '__create__';

/**
 * Settings → accounts waiting for approval. An email/password sign-up stays
 * pending (sees nothing) until an admin links it to the right member, or
 * creates one. The same-email member is preselected as a suggestion only.
 */
export function PendingAccounts({
  users, members, onApproved,
}: { users: PendingUser[]; members: LinkableMember[]; onApproved: () => void }) {
  const { t, language } = useLang();
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const label = (m: LinkableMember) =>
    [`${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || '—', m.email, m.house_church_name].filter(Boolean).join(' · ');

  const approve = async (u: PendingUser) => {
    const picked = choice[u.id] ?? u.suggested_member_id ?? '';
    if (!picked) return;
    setBusy(u.id);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(picked === CREATE_NEW ? { userId: u.id, create: true } : { userId: u.id, memberId: picked }),
      });
      if (!res.ok) throw new Error();
      setMessage({ kind: 'ok', text: t('settings.pendingApproved') });
      onApproved();
    } catch {
      setMessage({ kind: 'error', text: t('settings.pendingApproveError') });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card card-padded" style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
        {t('settings.pendingTitle')} ({users.length})
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{t('settings.pendingDesc')}</p>
      {message && (
        <div className={`settings-alert ${message.kind === 'ok' ? 'settings-alert-success' : 'settings-alert-error'}`} role="status">
          {message.text}
        </div>
      )}
      {users.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>{t('settings.pendingNone')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.map((u) => {
            const value = choice[u.id] ?? u.suggested_member_id ?? '';
            return (
              <div key={u.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                <div style={{ fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{u.email}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                  {t('settings.pendingSignedUp').replace('{date}', new Date(u.created_at).toLocaleString(language))}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="form-select"
                    aria-label={`${t('settings.pendingLinkTo')}: ${u.name}`}
                    value={value}
                    onChange={(e) => setChoice((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    style={{ flex: '1 1 240px', minWidth: 0 }}
                  >
                    <option value="">{t('settings.pendingChoose')}</option>
                    <option value={CREATE_NEW}>{t('settings.pendingCreateNew')}</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {label(m)}{m.id === u.suggested_member_id ? ` ${t('settings.pendingSameEmail')}` : ''}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-primary" disabled={!value || busy === u.id} onClick={() => approve(u)}>
                    {t('settings.pendingApprove')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
