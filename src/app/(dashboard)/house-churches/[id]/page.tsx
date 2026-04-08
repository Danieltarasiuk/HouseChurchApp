'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { ArrowLeft, Pencil } from 'lucide-react';
import HouseChurchModal from '@/components/HouseChurchModal';
import { getHCColor } from '@/lib/map-utils';
import type { MapMarker } from '@/lib/map-utils';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface HouseChurch {
  id: string;
  name: string;
  description: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  pco_campus_id: string | null;
  campus_name: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  latitude: number | null;
  longitude: number | null;
  pastor_id: string | null;
  host_id: string | null;
  trainee_id: string | null;
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
  latitude: number | null;
  longitude: number | null;
  house_church_id: string | null;
}

interface Campus {
  pco_campus_id: string;
  campus_name: string;
  member_count: number;
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
  return age > 120 ? null : age;
}

function formatBirthday(dob: string, lang: string): string {
  const d = parseDate(dob);
  if (!d) return '—';
  return d.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric' });
}

function formatMemberAddress(m: { address_street: string | null; address_city: string | null; address_state: string | null; address_zip: string | null }): string | null {
  const stateZip = m.address_state && m.address_zip ? `${m.address_state} ${m.address_zip}` : m.address_state || m.address_zip;
  const parts = [m.address_street, m.address_city, stateZip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

type SortColumn = 'name' | 'gender' | 'age' | 'birthday' | 'address' | 'email' | 'phone';
type SortDir = 'asc' | 'desc';

function birthdayKey(dob: string | null): number | null {
  if (!dob) return null;
  const d = parseDate(dob);
  if (!d) return null;
  return (d.getMonth() + 1) * 100 + d.getDate();
}

function compareSorted(a: string | number | null, b: string | number | null, dir: SortDir): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'string' && typeof b === 'string') {
    const cmp = a.localeCompare(b, undefined, { sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  }
  const diff = (a as number) - (b as number);
  return dir === 'asc' ? diff : -diff;
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
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [hcMembers, setHcMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);

  const loadData = useCallback(() => {
    Promise.all([
      fetch('/api/house-churches').then((r) => r.json()),
      fetch('/api/members').then((r) => r.json()),
    ])
      .then(([hcData, memData]) => {
        const found = (hcData.churches || []).find((c: HouseChurch) => String(c.id) === hcId);
        setChurch(found || null);
        setCampuses(hcData.campuses || []);
        const members: Member[] = memData.members || [];
        setAllMembers(members);
        setHcMembers(members.filter((m) => String(m.house_church_id) === hcId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hcId]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatAddress = (hc: HouseChurch) => {
    const stateZip = hc.address_state && hc.address_zip ? `${hc.address_state} ${hc.address_zip}` : hc.address_state || hc.address_zip;
    const parts = [hc.address_street, hc.address_city, stateZip].filter(Boolean);
    return parts.join(', ') || hc.location || null;
  };

  const mapMarkers: MapMarker[] = useMemo(() => {
    if (!church) return [];
    const markers: MapMarker[] = [];
    const allHCIds = [church.id];
    const color = getHCColor(church.id, allHCIds);

    if (church.latitude && church.longitude) {
      markers.push({
        id: `hc-${church.id}`,
        lat: church.latitude,
        lng: church.longitude,
        type: 'house_church',
        color,
        tooltipHtml: `<strong>${church.name}</strong>`,
      });
    }

    for (const m of hcMembers) {
      if (m.latitude && m.longitude) {
        const addr = formatMemberAddress(m);
        markers.push({
          id: `mem-${m.id}`,
          lat: m.latitude,
          lng: m.longitude,
          type: 'member',
          color,
          tooltipHtml: `<strong>${m.first_name} ${m.last_name}</strong><br/>${addr || '—'}`,
        });
      }
    }

    return markers;
  }, [church, hcMembers]);

  const cycleSort = (col: SortColumn) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); }
    else if (sortDir === 'asc') { setSortDir('desc'); }
    else { setSortCol(null); setSortDir(null); }
  };

  const sortIndicator = (col: SortColumn) => {
    if (sortCol === col) return sortDir === 'asc' ? ' ↑' : ' ↓';
    return <span style={{ opacity: 0.3, marginLeft: '2px' }}> ↕</span>;
  };

  const sortedMembers = useMemo(() => {
    if (!sortCol || !sortDir) return hcMembers;
    return [...hcMembers].sort((a, b) => {
      let va: string | number | null;
      let vb: string | number | null;
      switch (sortCol) {
        case 'name':
          va = `${a.first_name} ${a.last_name}`;
          vb = `${b.first_name} ${b.last_name}`;
          break;
        case 'gender':
          va = a.gender;
          vb = b.gender;
          break;
        case 'age':
          va = a.date_of_birth ? calcAge(a.date_of_birth) : null;
          vb = b.date_of_birth ? calcAge(b.date_of_birth) : null;
          break;
        case 'birthday':
          va = birthdayKey(a.date_of_birth);
          vb = birthdayKey(b.date_of_birth);
          break;
        case 'address':
          va = formatMemberAddress(a);
          vb = formatMemberAddress(b);
          break;
        case 'email':
          va = a.email || null;
          vb = b.email || null;
          break;
        case 'phone':
          va = a.phone;
          vb = b.phone;
          break;
      }
      return compareSorted(va!, vb!, sortDir);
    });
  }, [hcMembers, sortCol, sortDir]);

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
    <div className="hc-detail-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={() => router.push('/house-churches')}>
          <ArrowLeft size={16} /> {t('hc.back')}
        </button>
        {isAdmin && (
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
            <Pencil size={14} /> {t('common.edit')}
          </button>
        )}
      </div>

      {/* HC Info Card */}
      <div className="card hc-detail-card-wrap">
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

      {/* Map */}
      <div className="hc-detail-map-wrap" style={{ marginTop: '20px', overflow: 'hidden' }}>
        <MapComponent
          markers={mapMarkers}
          height="320px"
          emptyMessage={language === 'es' ? 'No hay datos de ubicación.' : 'No location data available.'}
        />
      </div>

      {/* Members Table */}
      <div className="card hc-detail-table-wrap" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">
            {t('hc.members')} ({hcMembers.length})
          </h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {([
                  ['name', t('common.name'), ''],
                  ['gender', t('mem.gender'), ''],
                  ['age', t('mem.age'), ''],
                  ['birthday', t('mem.birthday'), ''],
                  ['address', t('mem.address'), 'col-address'],
                  ['email', t('auth.email'), 'col-hide-mobile'],
                  ['phone', t('mem.phone'), 'col-hide-mobile'],
                ] as [SortColumn, string, string][]).map(([col, label, cls]) => (
                  <th
                    key={col}
                    className={`sortable-th ${cls}`}
                    onClick={() => cycleSort(col)}
                  >
                    {label}{sortIndicator(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '24px' }}>
                    {t('hc.noMembers')}
                  </td>
                </tr>
              ) : (
                sortedMembers.map((m) => {
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

      {/* Edit Modal */}
      {showEditModal && (
        <HouseChurchModal
          houseChurch={church}
          members={allMembers}
          campuses={campuses}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
