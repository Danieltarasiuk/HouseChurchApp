'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { Plus, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import HouseChurchModal from '@/components/HouseChurchModal';

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
}

interface Campus {
  pco_campus_id: string;
  campus_name: string;
  member_count: number;
}

export default function HouseChurchesPage() {
  const { t } = useLang();
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

  const openCreate = () => {
    setEditingHC(null);
    setShowModal(true);
    setMessage('');
  };

  const openEdit = (hc: HouseChurch) => {
    setEditingHC(hc);
    setShowModal(true);
    setMessage('');
  };

  const handleModalSaved = () => {
    setShowModal(false);
    setMessage(editingHC ? t('hc.updated') : t('hc.created'));
    loadData();
  };

  const toggleCampus = (key: string) => {
    setCollapsedCampuses(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group churches by campus
  const grouped = (() => {
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
  })();

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

      {churches.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('common.noResults')}</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([campusName, campusChurches]) => (
          <div key={campusName} style={{ marginBottom: '24px' }}>
            <button
              onClick={() => toggleCampus(campusName)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: '12px', padding: '4px 0',
              }}
            >
              {collapsedCampuses.has(campusName) ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
              {campusName}
              <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '13px' }}>
                ({campusChurches.length})
              </span>
            </button>

            {!collapsedCampuses.has(campusName) && (
              <div className="hc-grid">
                {campusChurches.map((church) => (
                  <div
                    key={church.id}
                    className="hc-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/house-churches/${church.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/house-churches/${church.id}`); } }}
                  >
                    <div className="hc-card-top">
                      <h3>{church.name}</h3>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="badge badge-member">
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

                    {church.description && <p>{church.description}</p>}

                    <div className="hc-card-meta">
                      {church.pastor_name && (
                        <span><strong>{t('hc.pastor')}:</strong> {church.pastor_name}</span>
                      )}
                      {church.host_name && (
                        <span><strong>{t('hc.host')}:</strong> {church.host_name}</span>
                      )}
                      {church.meeting_day && (
                        <span>{church.meeting_day}{church.meeting_time ? ` @ ${church.meeting_time}` : ''}</span>
                      )}
                    </div>

                    {church.trainee_name && (
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light, var(--border))' }}>
                        <strong>{t('hc.trainee')}:</strong> {church.trainee_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}

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
