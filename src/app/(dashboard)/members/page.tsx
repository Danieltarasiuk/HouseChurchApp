'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { Map as MapIcon, List } from 'lucide-react';

const MemberMap = dynamic(() => import('@/components/MemberMap'), { ssr: false });

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  house_church_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

const roleLabel = (role: string, t: (k: string) => string) => {
  const translated = t('role.' + role);
  return translated.startsWith('role.') ? role.replace(/_/g, ' ') : translated;
};

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

export default function MembersPage() {
  const { t } = useLang();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const canSeeMap = userRole === 'admin' || userRole === 'house_church_pastor';

  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    fetch('/api/members')
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return fullName.includes(q) || m.email.toLowerCase().includes(q);
  });

  const mappableMembers = filtered.filter((m) => m.latitude && m.longitude);

  return (
    <div>
      <div className="page-header">
        <h2>{t('mem.title')}</h2>
        <p>{t('mem.sub')}</p>
      </div>

      {/* Map view */}
      {canSeeMap && view === 'map' && !loading && (
        <div style={{ marginBottom: '16px' }}>
          <MemberMap
            members={mappableMembers.map((m) => ({
              id: m.id,
              first_name: m.first_name,
              last_name: m.last_name,
              latitude: m.latitude!,
              longitude: m.longitude!,
              house_church_name: m.house_church_name,
            }))}
          />
          {mappableMembers.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '8px', fontSize: '13px' }}>
              {t('mem.noAddresses')}
            </p>
          )}
        </div>
      )}

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
            {canSeeMap && (
              <button
                className={`btn ${view === 'map' ? 'btn-primary' : ''}`}
                onClick={() => setView(view === 'list' ? 'map' : 'list')}
                title={view === 'list' ? t('mem.showMap') : t('mem.hideMap')}
              >
                {view === 'list' ? <MapIcon size={16} /> : <List size={16} />}
              </button>
            )}
          </div>
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
        )}
      </div>
    </div>
  );
}
