'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { meetingDayLabel } from '@/lib/formatDate';
import { Plus, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
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

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  group_id: string | null;
  group_name: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Campus {
  pco_campus_id: string;
  campus_name: string;
  member_count: number;
}

function fmtAddr(street: string | null, city: string | null, state: string | null, zip: string | null): string {
  const sz = state && zip ? `${state} ${zip}` : state || zip || '';
  return [street, city, sz].filter(Boolean).join(', ');
}

export default function GroupsPage() {
  const { t } = useLang();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === 'admin';

  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [message, setMessage] = useState('');
  const [filterCampus, setFilterCampus] = useState<string>('all');
  const [collapsedCampuses, setCollapsedCampuses] = useState<Set<string>>(new Set());

  const loadData = () => {
    Promise.all([
      fetch('/api/groups').then((r) => r.json()),
      fetch('/api/members').then((r) => r.json()),
    ])
      .then(([groupData, memData]) => {
        setGroups(groupData.groups || []);
        setCampuses(groupData.campuses || []);
        setMembers(memData.members || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => { setEditingGroup(null); setShowModal(true); setMessage(''); };
  const openEdit = (hc: Group) => { setEditingGroup(hc); setShowModal(true); setMessage(''); };
  const handleModalSaved = () => {
    setShowModal(false);
    setMessage(editingGroup ? t('group.updated') : t('group.created'));
    loadData();
  };

  const toggleCampus = (key: string) => {
    setCollapsedCampuses(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const filtered = filterCampus === 'all'
      ? groups
      : filterCampus === 'none'
        ? groups.filter(c => !c.campus_name)
        : groups.filter(c => c.campus_name === filterCampus);
    const byCampus = new Map<string, Group[]>();
    for (const group of filtered) {
      const key = group.campus_name || t('group.noCampus');
      if (!byCampus.has(key)) byCampus.set(key, []);
      byCampus.get(key)!.push(group);
    }
    return byCampus;
  }, [groups, filterCampus, t]);

  const allGroupIds = useMemo(() => groups.map(c => c.id).sort(), [groups]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    const pastorLabel = t('group.pastor');
    const membersLabel = t('group.members');

    for (const hc of groups) {
      if (hc.latitude && hc.longitude) {
        const color = getGroupColor(hc.id, allGroupIds);
        markers.push({
          id: `group-${hc.id}`,
          lat: hc.latitude,
          lng: hc.longitude,
          type: 'group',
          color,
          tooltipHtml: `<strong>${escapeHtml(hc.name)}</strong><br/>${escapeHtml(pastorLabel)}: ${escapeHtml(hc.pastor_name || '—')}<br/>${hc.meeting_day ? escapeHtml(meetingDayLabel(t, hc.meeting_day)) : ''} ${escapeHtml(hc.meeting_time)}<br/>${hc.member_count} ${escapeHtml(membersLabel)}`,
        });
      }
    }

    const noGroupLabel = t('mem.noGroup');
    for (const m of members) {
      if (m.latitude && m.longitude) {
        const color = m.group_id ? getGroupColor(m.group_id, allGroupIds) : '#9CA3AF';
        const addr = fmtAddr(m.address_street, m.address_city, m.address_state, m.address_zip);
        markers.push({
          id: `mem-${m.id}`,
          lat: m.latitude,
          lng: m.longitude,
          type: 'member',
          color,
          tooltipHtml: `<strong>${escapeHtml(`${m.first_name} ${m.last_name}`)}</strong><br/>${escapeHtml(m.group_name || noGroupLabel)}<br/>${escapeHtml(addr || '—')}`,
        });
      }
    }

    return markers;
  }, [groups, members, allGroupIds, t]);

  const emptyMsg = t('map.noLocationsSync');

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>{t('group.title')}</h2>
          <p>{t('group.sub')}</p>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {t('dashboard.loading')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{t('group.title')}</h2>
          <p>{t('group.sub')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {campuses.length > 0 && (
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '160px' }}
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
            >
              <option value="all">{t('group.allCampuses')}</option>
              {campuses.map((c) => (
                <option key={c.pco_campus_id} value={c.campus_name}>{c.campus_name}</option>
              ))}
              <option value="none">{t('group.noCampus')}</option>
            </select>
          )}
          {isAdmin && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> {t('group.create')}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: '16px', color: message.includes('Failed') || message.includes('Error') ? 'var(--danger)' : 'var(--accent)' }}>
          {message}
        </div>
      )}

      {/* Split layout: list left, map right */}
      <div className="group-split-layout">
        {/* Left panel — scrollable card list */}
        <div className="group-split-list">
          {groups.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)' }}>{t('common.noResults')}</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([campusName, campusGroups]) => (
              <div key={campusName} style={{ marginBottom: '20px' }}>
                <button
                  onClick={() => toggleCampus(campusName)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
                    marginBottom: '10px', padding: '4px 0',
                  }}
                >
                  {collapsedCampuses.has(campusName) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  {campusName}
                  <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    ({campusGroups.length})
                  </span>
                </button>

                {!collapsedCampuses.has(campusName) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {campusGroups.map((group) => {
                      const color = getGroupColor(group.id, allGroupIds);
                      return (
                        <div
                          key={group.id}
                          className="group-card"
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/groups/${group.id}`)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/groups/${group.id}`); } }}
                        >
                          <div className="group-card-top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                              <h3>{group.name}</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className="badge badge-member" style={{ fontSize: '11px' }}>
                                {group.member_count} {t('group.members')}
                              </span>
                              {isAdmin && (
                                <button
                                  className="btn btn-ghost"
                                  style={{ padding: '4px', minWidth: 'auto' }}
                                  onClick={(e) => { e.stopPropagation(); openEdit(group); }}
                                  title={t('common.edit')}
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="group-card-meta" style={{ fontSize: '12px' }}>
                            {group.pastor_name && (
                              <span><strong>{t('group.pastor')}:</strong> {group.pastor_name}</span>
                            )}
                            {group.meeting_day && (
                              <span>{meetingDayLabel(t, group.meeting_day)}{group.meeting_time ? ` @ ${group.meeting_time}` : ''}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right panel — map */}
        <div className="group-split-map">
          <MapComponent markers={mapMarkers} height="100%" emptyMessage={emptyMsg} />
        </div>
      </div>

      {showModal && (
        <GroupModal
          group={editingGroup}
          members={members}
          campuses={campuses}
          onClose={() => setShowModal(false)}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
