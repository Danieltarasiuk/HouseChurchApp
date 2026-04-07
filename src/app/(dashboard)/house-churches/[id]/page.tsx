'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { ArrowLeft, Pencil } from 'lucide-react';

interface HouseChurch {
  id: string;
  name: string;
  description: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  campus_name: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  pastor_name: string | null;
  host_name: string | null;
  trainee_name: string | null;
  member_count: number;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  gender: string | null;
  date_of_birth: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  house_church_id: string | null;
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

function parseDate(d: string): Date | null {
  const parts = d.split('-');
  if (parts.length !== 3) return null;
  const [y, m, day] = parts.map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function calcAge(dob: string): number | null {
  const birth = parseDate(dob);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatBirthday(dob: string, lang: string): string {
  const d = parseDate(dob);
  if (!d) return '—';
  return d.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric' });
}

function formatMemberAddress(m: Member): string | null {
  const parts = [m.address_street, m.address_city, m.address_state, m.address_zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export default function HouseChurchDetailPage() {
  const { t, language } = useLang();
  const router = useRouter();
  const params = useParams();
  const hcId = params.id as string;
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === 'admin';

  const [church, setChurch] = useState<HouseChurch | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/house-churches').then((r) => r.json()),
      fetch('/api/members').then((r) => r.json()),
    ])
      .then(([hcData, memData]) => {
        const found = (hcData.churches || []).find((c: HouseChurch) => String(c.id) === hcId);
        setChurch(found || null);
        const allMembers: Member[] = memData.members || [];
        setMembers(allMembers.filter((m) => String(m.house_church_id) === hcId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hcId]);

  const formatAddress = (hc: HouseChurch) => {
    const parts = [hc.address_street, hc.address_city, hc.address_state, hc.address_zip].filter(Boolean);
    return parts.join(', ') || hc.location || null;
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>{t('hc.title')}</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {t('dashboard.loading')}
        </div>
      </div>
    );
  }

  if (!church) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => router.push('/house-churches')}>
            <ArrowLeft size={16} /> {t('hc.back')}
          </button>
        </div>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('common.noResults')}</p>
        </div>
      </div>
    );
  }

  const addr = formatAddress(church);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={() => router.push('/house-churches')}>
          <ArrowLeft size={16} /> {t('hc.back')}
        </button>
        {isAdmin && (
          <button className="btn btn-secondary" onClick={() => router.push('/house-churches')}>
            <Pencil size={14} /> {t('common.edit')}
          </button>
        )}
      </div>

      {/* HC Info Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{church.name}</h2>
          {church.campus_name && (
            <span className="badge badge-member">{church.campus_name}</span>
          )}
        </div>

        {church.description && <p style={{ padding: '0 24px', marginTop: '12px' }}>{church.description}</p>}

        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {church.pastor_name && (
            <div><strong>{t('hc.pastor')}:</strong> {church.pastor_name}</div>
          )}
          {church.host_name && (
            <div><strong>{t('hc.host')}:</strong> {church.host_name}</div>
          )}
          {church.trainee_name && (
            <div><strong>{t('hc.trainee')}:</strong> {church.trainee_name}</div>
          )}
          {church.meeting_day && (
            <div><strong>{t('hc.meetingTime')}:</strong> {church.meeting_day}{church.meeting_time ? ` @ ${church.meeting_time}` : ''}</div>
          )}
          {addr && (
            <div style={{ gridColumn: '1 / -1' }}><strong>{t('hc.address')}:</strong> {addr}</div>
          )}
        </div>
      </div>

      {/* Members Table */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">
            {t('hc.members')} ({members.length})
          </h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('mem.gender')}</th>
                <th>{t('mem.age')}</th>
                <th>{t('mem.birthday')}</th>
                <th className="col-address">{t('mem.address')}</th>
                <th className="col-hide-mobile">{t('auth.email')}</th>
                <th className="col-hide-mobile">{t('mem.phone')}</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                    {t('hc.noMembers')}
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const age = m.date_of_birth ? calcAge(m.date_of_birth) : null;
                  const bday = m.date_of_birth ? formatBirthday(m.date_of_birth, language) : '—';
                  const mAddr = formatMemberAddress(m);

                  return (
                    <tr key={m.id}>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {m.first_name} {m.last_name}
                          {m.role !== 'member' && (
                            <span className={roleBadgeClass(m.role)} style={{ fontSize: '10px', padding: '1px 7px' }}>
                              {roleLabel(m.role, t)}
                            </span>
                          )}
                        </span>
                      </td>
                      <td>{m.gender || '—'}</td>
                      <td>{age !== null ? age : '—'}</td>
                      <td>{bday}</td>
                      <td className="col-address">
                        {mAddr ? (
                          <span className="address-truncate" title={mAddr}>{mAddr}</span>
                        ) : '—'}
                      </td>
                      <td className="col-hide-mobile">{m.email || '—'}</td>
                      <td className="col-hide-mobile">{m.phone || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
