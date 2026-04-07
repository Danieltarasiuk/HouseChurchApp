'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { Shield, CloudDownload, Link as LinkIcon, CheckCircle } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
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
  const { t } = useLang();
  const { data: session } = useSession();
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

  // Planning Center state
  const [pcoConnected, setPcoConnected] = useState(false);
  const [pcoImporting, setPcoImporting] = useState(false);
  const [pcoResult, setPcoResult] = useState('');

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
    } catch {
      setError(t('settings.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin, fetchUsers]);

  // Check for PCO callback params
  useEffect(() => {
    if (searchParams.get('pco_connected') === 'true') {
      setPcoConnected(true);
      setSuccess(t('settings.pcoConnected'));
      setTimeout(() => setSuccess(''), 5000);
    }
    if (searchParams.get('pco_error')) {
      setError(t('settings.pcoError'));
    }
  }, [searchParams, t]);

  // Check if PCO is already connected
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/planning-center/status')
        .then((res) => res.json())
        .then((data) => {
          if (data.connected) setPcoConnected(true);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

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
        setError(data.error || t('settings.updateError'));
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
        setError(data.error || t('settings.pcoImportError'));
        return;
      }

      setPcoResult(
        t('settings.pcoSyncSuccess')
          .replace('{imported}', String(data.imported))
          .replace('{skipped}', String(data.skipped))
          .replace('{archived}', String(data.archived || 0))
          .replace('{campuses}', String(data.campuses || 0))
          .replace('{total}', String(data.total))
      );
      setTimeout(() => setPcoResult(''), 8000);
    } catch {
      setError(t('settings.pcoImportError'));
    } finally {
      setPcoImporting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  if (!isAdmin) {
    return (
      <div>
        <div className="page-header">
          <h2>{t('settings.title')}</h2>
          <p>{t('settings.sub')}</p>
        </div>
        <div className="card card-padded">
          <div className="settings-no-access">
            <Shield size={48} />
            <h3>{t('settings.noPermission')}</h3>
            <p>{t('settings.adminOnly')}</p>
          </div>
        </div>
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
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {pcoConnected ? (
              <>
                <span className="badge badge-active" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                  <CheckCircle size={12} />
                  {t('settings.pcoStatusConnected')}
                </span>
                <button
                  className="btn btn-primary"
                  onClick={importFromPco}
                  disabled={pcoImporting}
                >
                  <CloudDownload size={14} />
                  {pcoImporting ? t('settings.pcoSyncing') : t('settings.pcoSync')}
                </button>
              </>
            ) : (
              <a href="/api/planning-center/authorize" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                <LinkIcon size={14} />
                {t('settings.pcoConnect')}
              </a>
            )}
          </div>
        </div>
        {pcoResult && (
          <div className="settings-alert settings-alert-success" role="status" style={{ marginTop: '16px', marginBottom: 0 }}>
            {pcoResult}
          </div>
        )}
      </div>

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
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
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
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={roleBadgeClass(user.role)}>
                            {t('role.' + user.role)}
                          </span>
                        </td>
                        <td>
                          {isSelf ? (
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
