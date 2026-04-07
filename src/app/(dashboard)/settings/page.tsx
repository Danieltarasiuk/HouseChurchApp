'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { Shield } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLES = ['member', 'house_church_pastor', 'senior_pastor'] as const;

const roleBadgeClass = (role: string) => {
  switch (role) {
    case 'senior_pastor':
      return 'badge badge-pastor';
    case 'house_church_pastor':
      return 'badge badge-leader';
    default:
      return 'badge badge-member';
  }
};

export default function SettingsPage() {
  const { t } = useLang();
  const { data: session } = useSession();
  const currentUserRole = (session?.user as { role?: string })?.role;
  const currentUserId = session?.user?.id;
  const isAdmin = currentUserRole === 'senior_pastor';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

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
