'use client';

import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { MOCK_MEMBERS } from '@/data/mock-data';

const roleLabel = (role: string, t: (k: string) => string) => {
  const translated = t('role.' + role);
  // t() returns the key itself as fallback — detect that and format the raw role
  return translated.startsWith('role.') ? role.replace(/_/g, ' ') : translated;
};

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

export default function MembersPage() {
  const { t } = useLang();
  const [search, setSearch] = useState('');

  const filtered = MOCK_MEMBERS.filter((m) => {
    const q = search.toLowerCase();
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return fullName.includes(q) || m.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <h2>{t('mem.title')}</h2>
        <p>{t('mem.sub')}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">{t('mem.title')} ({filtered.length})</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder={t('mem.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('mem.search')}
            />
            <button className="btn btn-primary" disabled title={t('coming.soon')}>
              {t('mem.addMember')}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('auth.email')}</th>
                <th>{t('mem.phone')}</th>
                <th>{t('mem.houseChurch')}</th>
                <th>{t('mem.role')}</th>
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
                filtered.map((member) => (
                  <tr key={member.id}>
                    <td>{member.first_name} {member.last_name}</td>
                    <td>{member.email}</td>
                    <td>{member.phone || '—'}</td>
                    <td>{member.house_church_name || '—'}</td>
                    <td>
                      <span className={roleBadgeClass(member.role)}>
                        {roleLabel(member.role, t)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
