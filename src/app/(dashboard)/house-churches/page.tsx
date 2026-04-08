'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { Plus, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
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
  house_church_id: string | null;
  house_church_name: string | null;
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

export default function HouseChurchesPage() {
  const { t, language } = useLang();
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === 'admin';

  const [churches, setChurches] = useState<HouseChurch[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHC, setEditingHC] = useState<HouseChurch | null>(null);
  const [message, setMessage] = useState('');
  const [filterCampus, setFilterCampus] = useState<string>('all');
  const [collapsedCampuses, setCollapsedCampuses] = useState<Set<string>>(new Set());

  const loadData = () => {
    Promise.all([
      fetch('/api/house-churches').then((r) => r.json()),
      fetch('/api/members').then((r) => r.json()),
    ])
      .then(([hcData, memData]) => {
        setChurches(hcData.churches || []);
        setCampuses(hcData.campuses || []);
        setMembers(memData.members || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => { setEditingHC(null); setShowModal(true); setMessage(''); };
  const openEdit = (hc: HouseChurch) => { setEditingHC(hc); setShowModal(true); setMessage(''); };
  const handleModalSaved = () => {
    setShowModal(false);
    setMessage(editingHC ? t('hc.updated') : t('hc.created'));
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
      ? churches
      : filterCampus === 'none'
        ? churches.filter(c => !c.campus_name)
        : churches.filter(c => c.campus_name === filterCampus);
    const groups = new Map<string, HouseChurch[]>();
    for (const church of filtered) {
      const key = church.campus_name || t('hc.noCampus');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(church);
    }
    return groups;
  }, [churches, filterCampus, t]);

  const allHCIds = useMemo(() => churches.map(c => c.id).sort(), [churches]);

  const mapMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    const pastorLabel = language === 'es' ? 'Pastor' : 'Pastor';
    const membersLabel = language === 'es' ? 'miembros' : 'members';

    for (const hc of churches) {
      if (hc.latitude && hc.longitude) {
        const color = getHCColor(hc.id, allHCIds);
        markers.push({
          id: `hc-${hc.id}`,
          lat: hc.latitude,
          lng: hc.longitude,
          type: 'house_church',
          color,
          tooltipHtml: `<strong>${hc.name}</strong><br/>${pastorLabel}: ${hc.pastor_name || '—'}<br/>${hc.meeting_day || ''} ${hc.meeting_time || ''}<br/>${hc.member_count} ${membersLabel}`,
        });
      }
    }

    const noHCLabel = language === 'es' ? 'Sin iglesia en casa' : 'No house church';
    for (const m of members) {
      if (m.latitude && m.longitude) {
        const color = m.house_church_id ? getHCColor(m.house_church_id, allHCIds) : '#9CA3AF';
        const addr = fmtAddr(m.address_street, m.address_city, m.address_state, m.address_zip);
        markers.push({
          id: `mem-${m.id}`,
          lat: m.latitude,
          lng: m.longitude,
          type: 'member',
          color,
          tooltipHtml: `<strong>${m.first_name} ${m.last_name}</strong><br/>${m.house_church_name || noHCLabel}<br/>${addr || '—'}`,
        });
      }
    }

    return markers;
  }, [churches, members, allHCIds, language]);

  const emptyMsg = language === 'es'
    ? 'No hay datos de ubicación. Sincroniza desde Planning Center para importar direcciones.'
    : 'No location data available. Sync from Planning Center to import addresses.';

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>{t('hc.title')}</h2>
          <p>{t('hc.sub')}</p>
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
          <h2>{t('hc.title')}</h2>
          <p>{t('hc.sub')}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {campuses.length > 0 && (
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '160px' }}
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
            >
              <option value="all">{t('hc.allCampuses')}</option>
              {campuses.map((c) => (
                <option key={c.pco_campus_id} value={c.campus_name}>{c.campus_name}</option>
              ))}
              <option value="none">{t('hc.noCampus')}</option>
            </select>
          )}
          {isAdmin && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> {t('hc.create')}
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
      <div className="hc-split-layout">
        {/* Left panel — scrollable card list */}
        <div className="hc-split-list">
          {churches.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)' }}>{t('common.noResults')}</p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([campusName, campusChurches]) => (
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
                    ({campusChurches.length})
                  </span>
                </button>

                {!collapsedCampuses.has(campusName) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {campusChurches.map((church) => {
                      const color = getHCColor(church.id, allHCIds);
                      return (
                        <div
                          key={church.id}
                          className="hc-card"
                          style={{ cursor: 'pointer' }}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/house-churches/${church.id}`)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/house-churches/${church.id}`); } }}
                        >
                          <div className="hc-card-top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                              <h3>{church.name}</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span className="badge badge-member" style={{ fontSize: '11px' }}>
                                {church.member_count} {t('hc.members')}
                              </span>
                              {isAdmin && (
                                <button
                                  className="btn btn-ghost"
                                  style={{ padding: '4px', minWidth: 'auto' }}
                                  onClick={(e) => { e.stopPropagation(); openEdit(church); }}
                                  title={t('common.edit')}
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="hc-card-meta" style={{ fontSize: '12px' }}>
                            {church.pastor_name && (
                              <span><strong>{t('hc.pastor')}:</strong> {church.pastor_name}</span>
                            )}
                            {church.meeting_day && (
                              <span>{church.meeting_day}{church.meeting_time ? ` @ ${church.meeting_time}` : ''}</span>
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
        <div className="hc-split-map">
          <MapComponent markers={mapMarkers} height="100%" emptyMessage={emptyMsg} />
        </div>
      </div>

      {showModal && (
        <HouseChurchModal
          houseChurch={editingHC}
          members={members}
          campuses={campuses}
          onClose={() => setShowModal(false)}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
