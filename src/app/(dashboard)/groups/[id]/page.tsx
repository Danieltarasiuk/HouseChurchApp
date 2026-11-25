'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { genderLabel, meetingDayLabel } from '@/lib/formatDate';
import { PrivacyControls } from '@/components/PrivacyControls';
import { birthdayMD, birthdayKeyMD, formatBirthdayMD, isMinorRow } from '@/lib/memberDisplay';
import { ArrowLeft, Pencil } from 'lucide-react';
import GroupModal from '@/components/GroupModal';
import { getGroupColor, escapeHtml } from '@/lib/map-utils';
import type { MapMarker } from '@/lib/map-utils';

const MapComponent = dynamic(() => import('@/components/MapComponent'), { ssr: false });

interface Group {
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

/** From /api/members: fields this viewer may not see are absent. */
interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  gender: string | null;
  date_of_birth?: string | null;
  birthday?: string | null;
  is_minor?: boolean;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  group_id: string | null;
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
    case 'group_leader':
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


function formatMemberAddress(m: { address_street?: string | null; address_city?: string | null; address_state?: string | null; address_zip?: string | null }): string | null {
  const stateZip = m.address_state && m.address_zip ? `${m.address_state} ${m.address_zip}` : m.address_state || m.address_zip;
  const parts = [m.address_street, m.address_city, stateZip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

type SortColumn = 'name' | 'gender' | 'age' | 'birthday' | 'address' | 'email' | 'phone';
type SortDir = 'asc' | 'desc';

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

export default function GroupDetailPage() {
  const { t, language } = useLang();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === 'admin';

  const [group, setGroup] = useState<Group | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [sortCol, setSortCol] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);
  const [showMinors, setShowMinors] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      fetch('/api/groups').then((r) => r.json()),
      fetch('/api/members').then((r) => r.json()),
    ])
      .then(([groupData, memData]) => {
        const found = (groupData.groups || []).find((c: Group) => String(c.id) === groupId);
        setGroup(found || null);
        setCampuses(groupData.campuses || []);
        const members: Member[] = memData.members || [];
        setAllMembers(members);
        setGroupMembers(members.filter((m) => String(m.group_id) === groupId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatAddress = (hc: Group) => {
    const stateZip = hc.address_state && hc.address_zip ? `${hc.address_state} ${hc.address_zip}` : hc.address_state || hc.address_zip;
    const parts = [hc.address_street, hc.address_city, stateZip].filter(Boolean);
    return parts.join(', ') || hc.location || null;
  };

  const mapMarkers: MapMarker[] = useMemo(() => {
    if (!group) return [];
    const markers: MapMarker[] = [];
    const allGroupIds = [group.id];
    const color = getGroupColor(group.id, allGroupIds);

    if (group.latitude && group.longitude) {
      markers.push({
        id: `group-${group.id}`,
        lat: group.latitude,
        lng: group.longitude,
        type: 'group',
        color,
        tooltipHtml: `<strong>${escapeHtml(group.name)}</strong>`,
      });
    }

    for (const m of groupMembers) {
      if (m.latitude && m.longitude) {
        const addr = formatMemberAddress(m);
        markers.push({
          id: `mem-${m.id}`,
          lat: m.latitude,
          lng: m.longitude,
          type: 'member',
          color,
          tooltipHtml: `<strong>${escapeHtml(`${m.first_name} ${m.last_name}`)}</strong><br/>${escapeHtml(addr || '—')}`,
        });
      }
    }

    return markers;
  }, [group, groupMembers]);

  const cycleSort = (col: SortColumn) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); }
    else if (sortDir === 'asc') { setSortDir('desc'); }
    else { setSortCol(null); setSortDir(null); }
  };

  const sortIndicator = (col: SortColumn) => {
    if (sortCol === col) return sortDir === 'asc' ? ' ↑' : ' ↓';
    return <span style={{ opacity: 0.3, marginLeft: '2px' }}> ↕</span>;
  };

  const filteredMembers = useMemo(() => {
    if (showMinors) return groupMembers;
    return groupMembers.filter(m => !isMinorRow(m, calcAge));
  }, [groupMembers, showMinors]);

  const sortedMembers = useMemo(() => {
    if (!sortCol || !sortDir) return filteredMembers;
    return [...filteredMembers].sort((a, b) => {
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
          va = birthdayKeyMD(birthdayMD(a));
          vb = birthdayKeyMD(birthdayMD(b));
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
          va = a.phone ?? null;
          vb = b.phone ?? null;
          break;
      }
      return compareSorted(va!, vb!, sortDir);
    });
  }, [filteredMembers, sortCol, sortDir]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>{t('group.title')}</h2>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {t('dashboard.loading')}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-ghost" onClick={() => router.push('/groups')}>
            <ArrowLeft size={16} /> {t('group.back')}
          </button>
        </div>
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('common.noResults')}</p>
        </div>
      </div>
    );
  }

  const addr = formatAddress(group);

  return (
    <div className="group-detail-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={() => router.push('/groups')}>
          <ArrowLeft size={16} /> {t('group.back')}
        </button>
        {isAdmin && (
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
            <Pencil size={14} /> {t('common.edit')}
          </button>
        )}
      </div>

      {/* Group info card */}
      <div className="card group-detail-card-wrap">
        <div className="card-header">
          <h2 className="card-title">{group.name}</h2>
          {group.campus_name && (
            <span className="badge badge-member">{group.campus_name}</span>
          )}
        </div>

        {group.description && <p style={{ padding: '0 24px', marginTop: '12px' }}>{group.description}</p>}

        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {group.pastor_name && (
            <div><strong>{t('group.pastor')}:</strong> {group.pastor_name}</div>
          )}
          {group.host_name && (
            <div><strong>{t('group.host')}:</strong> {group.host_name}</div>
          )}
          {group.trainee_name && (
            <div><strong>{t('group.trainee')}:</strong> {group.trainee_name}</div>
          )}
          {group.meeting_day && (
            <div><strong>{t('group.meetingTime')}:</strong> {meetingDayLabel(t, group.meeting_day)}{group.meeting_time ? ` @ ${group.meeting_time}` : ''}</div>
          )}
          {addr && (
            <div style={{ gridColumn: '1 / -1' }}><strong>{t('group.address')}:</strong> {addr}</div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="group-detail-map-wrap" style={{ marginTop: '20px', overflow: 'hidden' }}>
        <MapComponent
          markers={mapMarkers}
          height="320px"
          emptyMessage={t('map.noLocations')}
        />
      </div>

      {/* Members Table */}
      <div className="card group-detail-table-wrap" style={{ marginTop: '20px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title">
            {t('group.members')} ({filteredMembers.length})
          </h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={showMinors} onChange={() => setShowMinors(!showMinors)} />
            {t('mem.showMinors')}
          </label>
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
                    {t('group.noMembers')}
                  </td>
                </tr>
              ) : (
                sortedMembers.map((m) => {
                  const age = m.date_of_birth ? calcAge(m.date_of_birth) : null;
                  const bday = formatBirthdayMD(birthdayMD(m), language);
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
                      <td>{genderLabel(t, m.gender)}</td>
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

      {/* Directory privacy for this group (admins and its pastor only) */}
      <div className="card card-padded" style={{ marginTop: '20px' }}>
        <PrivacyControls
          scope="group"
          id={groupId}
          title={t('privacy.groupTitle')}
          description={t('privacy.groupDesc')}
        />
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <GroupModal
          group={group}
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
