'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { Map as MapIcon, List } from 'lucide-react';

const MemberMap = dynamic(() => import('@/components/MemberMap'), { ssr: false });

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  house_church_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
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

/** Parse YYYY-MM-DD safely without timezone shift */
function parseDate(d: string): Date | null {
  const parts = d.split('-');
  if (parts.length !== 3) return null;
  const [y, m, day] = parts.map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

/** Calculate age from YYYY-MM-DD date_of_birth */
function calcAge(dob: string): number | null {
  const birth = parseDate(dob);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/** Format birthday as "Mon DD" (month + day only) */
function formatBirthday(dob: string, lang: string): string {
  const d = parseDate(dob);
  if (!d) return '—';
  return d.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric' });
}

/** Build formatted address string */
function formatAddress(m: Member): string | null {
  const parts = [m.address_street, m.address_city, m.address_state, m.address_zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function MembersPage() {
  const { t, language } = useLang();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const canSeeMap = userRole === 'admin' || userRole === 'house_church_pastor';

  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [redFlags, setRedFlags] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/members')
      .then((res) => res.json())
      .then((data) => setMembers(data.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    if (canSeeMap) {
      fetch('/api/pastoral/flags/summary')
        .then(r => r.json())
        .then(data => {
          const map: Record<string, number> = {};
          for (const f of (data.flags || [])) map[f.member_id] = f.red_count;
          setRedFlags(map);
        })
        .catch(() => {});
    }
  }, [canSeeMap]);

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
                  <th>{t('mem.houseChurch')}</th>
                  <th>{t('mem.gender')}</th>
                  <th>{t('mem.age')}</th>
                  <th>{t('mem.birthday')}</th>
                  <th className="col-address">{t('mem.address')}</th>
                  <th className="col-hide-mobile">{t('auth.email')}</th>
                  <th className="col-hide-mobile">{t('mem.phone')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                      {t('common.noResults')}
                    </td>
                  </tr>
                ) : (
                  filtered.map((member) => {
                    const age = member.date_of_birth ? calcAge(member.date_of_birth) : null;
                    const bday = member.date_of_birth ? formatBirthday(member.date_of_birth, language) : '—';
                    const addr = formatAddress(member);

                    return (
                      <tr key={member.id}>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {member.first_name} {member.last_name}
                            {member.role !== 'member' && (
                              <span className={roleBadgeClass(member.role)} style={{ fontSize: '10px', padding: '1px 7px' }}>
                                {roleLabel(member.role, t)}
                              </span>
                            )}
                            {redFlags[member.id] > 0 && (
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} title="Red flag" />
                            )}
                          </span>
                        </td>
                        <td>{member.house_church_name || '—'}</td>
                        <td>{member.gender || '—'}</td>
                        <td>{age !== null ? age : '—'}</td>
                        <td>{bday}</td>
                        <td className="col-address">
                          {addr ? (
                            <span className="address-truncate" title={addr}>{addr}</span>
                          ) : '—'}
                        </td>
                        <td className="col-hide-mobile">{member.email || '—'}</td>
                        <td className="col-hide-mobile">{member.phone || '—'}</td>
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
