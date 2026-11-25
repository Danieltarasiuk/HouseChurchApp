'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { CloudDownload, Link as LinkIcon, CheckCircle, Trash2 } from 'lucide-react';
import type { SyncStatus, SyncWarning } from '@/lib/pco';
import { NoAccess } from '@/components/NoAccess';
import { PrivacyControls } from '@/components/PrivacyControls';
import { PendingAccounts, type LinkableMember } from '@/components/PendingAccounts';

const PCO_REASONS = ['not_connected', 'missing_credentials', 'invalid_credentials', 'permission_denied', 'pco_unavailable', 'bad_refresh_response'];
const hasPcoReason = (r: string) => PCO_REASONS.includes(r);

const SYNC_STATUS_KEY: Record<SyncStatus, string> = {
  ok: 'settings.pcoSyncOk',
  warnings: 'settings.pcoSyncWarnings',
  failed: 'settings.pcoSyncFailed',
};

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
  created_at: string;
  suggested_member_id: string | null;
}

interface LastSync {
  source: string;
  status: SyncStatus;
  /** English summary; shown only for failures that carry no per-step warning. */
  summary: string;
  warnings: SyncWarning[];
  syncedCount: number | null;
  createdAt: string;
}

const ROLES = ['member', 'house_church_pastor', 'admin'] as const;

const roleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin':
      return 'badge badge-pastor';
    case 'house_church_pastor':
      return 'badge badge-leader';
    default:
      return 'badge badge-member';
  }
};

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { t, language } = useLang();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const currentUserRole = (session?.user as { role?: string })?.role;
  const currentUserId = session?.user?.id;
  const isAdmin = currentUserRole === 'admin';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [linkableMembers, setLinkableMembers] = useState<LinkableMember[]>([]);

  // Planning Center state
  const [pcoConnected, setPcoConnected] = useState(false);
  const [pcoImporting, setPcoImporting] = useState(false);
  const [pcoResult, setPcoResult] = useState('');
  const [pcoFailReason, setPcoFailReason] = useState('');
  /** Name of the admin whose Planning Center connection the sync uses. */
  const [pcoConnectedBy, setPcoConnectedBy] = useState('');
  const [lastSync, setLastSync] = useState<LastSync | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/users');
      if (!res.ok) {
        if (res.status === 403) {
          setError(t('settings.noPermission'));
        } else {
          setError(t('settings.loadError'));
        }
        return;
      }
      const data = await res.json();
      setUsers(data.users);
      setLinkableMembers(data.linkableMembers || []);
    } catch {
      setError(t('settings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === 'loading') return;
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [status, isAdmin, fetchUsers]);

  const removeUser = async (user: User) => {
    if (!window.confirm(t('settings.removeConfirm').replace('{name}', user.name || user.email))) return;
    setRemoving(user.id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('settings.removeError'));
        return;
      }
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setSuccess(t('settings.removedUser').replace('{name}', user.name || user.email));
    } catch {
      setError(t('settings.removeError'));
    } finally {
      setRemoving(null);
    }
  };

  // Check for PCO callback params
  useEffect(() => {
    if (searchParams.get('pco_connected') === 'true') {
      setPcoConnected(true);
      setSuccess(t('settings.pcoConnected'));
      setTimeout(() => setSuccess(''), 5000);
    }
    if (searchParams.get('pco_error')) {
      setError(t(searchParams.get('pco_error') === 'state_mismatch' ? 'settings.pcoStateMismatch' : 'settings.pcoError'));
    }
  }, [searchParams, t]);

  const fetchLastSync = useCallback(async () => {
    try {
      const res = await fetch('/api/planning-center/last-sync');
      if (!res.ok) return;
      const data = await res.json();
      setLastSync(data.lastSync);
    } catch {
      // Non-critical — the card just omits the last-sync line
    }
  }, []);

  // Check if PCO is already connected
  useEffect(() => {
    if (status === 'loading') return;
    if (isAdmin) {
      fetch('/api/planning-center/status')
        .then((res) => res.json())
        .then((data) => {
          setPcoConnectedBy(data.connectedBy?.name || '');
          if (data.connected) {
            setPcoConnected(true);
            setPcoFailReason('');
          } else {
            setPcoConnected(false);
            setPcoFailReason(data.reason || '');
          }
        })
        .catch(() => {
          setPcoFailReason('pco_unavailable');
        });
      fetchLastSync();
    }
  }, [status, isAdmin, fetchLastSync]);

  const lastSyncText = lastSync
    ? t('settings.pcoLastSync')
        .replace('{date}', new Date(lastSync.createdAt).toLocaleString(language))
        .replace('{source}', t('settings.pcoSource.' + lastSync.source))
        .replace('{status}', t(SYNC_STATUS_KEY[lastSync.status]))
    : '';

  /** "People: Planning Center returned HTTP 500", translated, params filled in. */
  const describeWarning = (w: SyncWarning) => {
    let reason = t('settings.syncWarn.' + w.code);
    for (const [k, v] of Object.entries(w.params ?? {})) reason = reason.replace(`{${k}}`, String(v));
    return `${t('settings.syncStep.' + w.step)}: ${reason}`;
  };

  const updateRole = async (userId: string, newRole: string) => {
    setUpdating(userId);
    setSuccess('');
    setError('');

    try {
      const res = await fetch('/api/settings/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.reason === 'pending' ? t('settings.approveFirst') : (data.error || t('settings.updateError')));
        return;
      }

      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === data.user.id ? data.user : u))
      );
      setSuccess(t('settings.roleUpdated'));
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError(t('settings.updateError'));
    } finally {
      setUpdating(null);
    }
  };

  const importFromPco = async () => {
    setPcoImporting(true);
    setPcoResult('');
    setError('');

    try {
      const res = await fetch('/api/planning-center/import', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        // Reason codes are translated here; the server's text is English.
        setError(data.reason && hasPcoReason(data.reason)
          ? t('settings.pcoConnFailed').replace('{reason}', t('settings.pcoReason.' + data.reason))
          : t('settings.pcoImportError'));
        return;
      }

      // A failed people step updates no member; the reasons appear below
      // from the refreshed last-sync entry.
      if (data.status === 'failed') {
        setError(t('settings.pcoSyncFailedRun'));
        return;
      }

      setPcoResult(
        t('settings.pcoSyncSuccess')
          .replace('{imported}', String(data.imported))
          .replace('{skipped}', String(data.skipped))
          .replace('{archived}', String(data.archived || 0))
          .replace('{campuses}', String(data.campuses || 0))
          .replace('{total}', String(data.total))
        + (data.houseChurchesDeactivated
          ? ' ' + t('settings.pcoHcDeactivated').replace('{count}', String(data.houseChurchesDeactivated))
          : '')
      );
      setTimeout(() => setPcoResult(''), 8000);
    } catch {
      setError(t('settings.pcoImportError'));
    } finally {
      setPcoImporting(false);
      // The route logs both successes and failures, so refresh either way
      fetchLastSync();
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Wait for the session: before it loads, the role is unknown, not 'member'.
  if (status === 'loading') return null;
  if (!isAdmin) {
    return (
      <div>
        <div className="page-header">
          <h2>{t('settings.title')}</h2>
          <p>{t('settings.sub')}</p>
        </div>
        <NoAccess />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>{t('settings.title')}</h2>
        <p>{t('settings.sub')}</p>
      </div>

      {error && (
        <div className="settings-alert settings-alert-error" role="alert">
          {error}
          <button onClick={() => setError('')} className="settings-alert-close">&times;</button>
        </div>
      )}
      {success && (
        <div className="settings-alert settings-alert-success" role="status">
          {success}
        </div>
      )}

      {/* Planning Center Integration */}
      <div className="card card-padded" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
              {t('settings.pcoTitle')}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {t('settings.pcoDesc')}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
              {lastSyncText || t('settings.pcoLastSyncNever')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {pcoConnected ? (
              <>
                <span className="badge badge-active" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                  <CheckCircle size={12} />
                  {pcoConnectedBy
                    ? t('settings.pcoConnectedAs').replace('{name}', pcoConnectedBy)
                    : t('settings.pcoStatusConnected')}
                </span>
                <button
                  className="btn btn-primary"
                  onClick={importFromPco}
                  disabled={pcoImporting}
                >
                  <CloudDownload size={14} />
                  {pcoImporting ? t('settings.pcoSyncing') : t('settings.pcoSync')}
                </button>
                {/* Re-run OAuth even while connected — needed when the app
                    gains a scope (e.g. check_ins) the stored token lacks. */}
                <a href="/api/planning-center/authorize" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                  <LinkIcon size={14} />
                  {t('settings.pcoReconnect')}
                </a>
              </>
            ) : (
              <a href="/api/planning-center/authorize" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                <LinkIcon size={14} />
                {pcoFailReason ? t('settings.pcoReconnect') : t('settings.pcoConnect')}
              </a>
            )}
          </div>
        </div>
        {pcoFailReason && !pcoConnected && (
          <div className="settings-alert settings-alert-error" role="alert" style={{ marginTop: '16px', marginBottom: 0 }}>
            {t('settings.pcoConnFailed').replace(
              '{reason}',
              t('settings.pcoReason.' + pcoFailReason)
            )}
          </div>
        )}
        {pcoResult && (
          <div className="settings-alert settings-alert-success" role="status" style={{ marginTop: '16px', marginBottom: 0 }}>
            {pcoResult}
          </div>
        )}
        {/* From the last sync_log row, so cron runs show here too, and the
            reasons stay until a clean sync replaces them. */}
        {lastSync && lastSync.status !== 'ok' && (
          <div
            className={`settings-alert ${lastSync.status === 'failed' ? 'settings-alert-error' : 'settings-alert-warning'}`}
            role="alert"
            style={{ marginTop: '16px', marginBottom: 0, display: 'block' }}
          >
            <div>{t(lastSync.status === 'failed' ? 'settings.pcoSyncFailedIntro' : 'settings.pcoSyncWarningsIntro')}</div>
            <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
              {lastSync.warnings.length > 0
                ? lastSync.warnings.map((w, i) => <li key={i}>{describeWarning(w)}</li>)
                : lastSync.summary && <li>{lastSync.summary}</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Directory privacy: the church default layer */}
      <div className="card card-padded" style={{ marginBottom: '24px' }}>
        <PrivacyControls
          scope="church"
          title={t('privacy.churchTitle')}
          description={t('privacy.churchDesc')}
        />
      </div>

      {/* Email sign-ups waiting for an admin to approve and link them */}
      <PendingAccounts
        users={users.filter((u) => u.status === 'pending')}
        members={linkableMembers}
        onApproved={fetchUsers}
      />

      {/* User Roles */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            {t('settings.manageRoles')} ({filtered.length})
          </div>
          <input
            type="text"
            className="form-input"
            placeholder={t('mem.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('mem.search')}
            style={{ maxWidth: '280px' }}
          />
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            {t('dashboard.loading')}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('auth.email')}</th>
                  <th>{t('settings.currentRole')}</th>
                  <th>{t('settings.changeRole')}</th>
                  <th>{t('settings.remove')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      {t('common.noResults')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => {
                    const isSelf = user.id === currentUserId;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user.name || '—'}
                            {isSelf && <span className="badge badge-you">{t('settings.you')}</span>}
                            {user.status === 'pending' && <span className="badge badge-you">{t('settings.statusPending')}</span>}
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={roleBadgeClass(user.role)}>
                            {t('role.' + user.role)}
                          </span>
                        </td>
                        <td>
                          {isSelf || user.status === 'pending' ? (
                            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>—</span>
                          ) : (
                            <select
                              className="form-select"
                              value={user.role}
                              onChange={(e) => updateRole(user.id, e.target.value)}
                              disabled={updating === user.id}
                              style={{ maxWidth: '220px' }}
                            >
                              {ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {t('role.' + role)}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          {isSelf ? (
                            <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>—</span>
                          ) : (
                            <button
                              className="btn btn-ghost"
                              onClick={() => removeUser(user)}
                              disabled={removing === user.id}
                              aria-label={t('settings.removeUser')}
                              title={t('settings.removeUser')}
                              style={{ color: '#dc2626' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
