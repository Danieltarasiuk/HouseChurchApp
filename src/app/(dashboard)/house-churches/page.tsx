'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { Plus, Pencil, ChevronDown, ChevronRight } from 'lucide-react';

interface HouseChurch {
  id: number;
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
  pastor_id: number | null;
  host_id: number | null;
  trainee_id: number | null;
  pastor_name: string | null;
  host_name: string | null;
  trainee_name: string | null;
  member_count: number;
}

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  house_church_id: number | null;
  house_church_name: string | null;
}

interface Campus {
  pco_campus_id: string;
  campus_name: string;
  member_count: number;
}

interface FormData {
  id?: number;
  name: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  location: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  pastor_id: string;
  host_id: string;
  trainee_id: string;
  campus_name: string;
  pco_campus_id: string;
}

const emptyForm: FormData = {
  name: '', description: '', meeting_day: '', meeting_time: '', location: '',
  address_street: '', address_city: '', address_state: '', address_zip: '',
  pastor_id: '', host_id: '', trainee_id: '', campus_name: '', pco_campus_id: '',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const roleLabel = (role: string, t: (k: string) => string) => {
  const translated = t('role.' + role);
  return translated.startsWith('role.') ? role.replace(/_/g, ' ') : translated;
};

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
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
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
    setForm(emptyForm);
    setShowModal(true);
    setMessage('');
  };

  const openEdit = (hc: HouseChurch) => {
    setForm({
      id: hc.id,
      name: hc.name || '',
      description: hc.description || '',
      meeting_day: hc.meeting_day || '',
      meeting_time: hc.meeting_time || '',
      location: hc.location || '',
      address_street: hc.address_street || '',
      address_city: hc.address_city || '',
      address_state: hc.address_state || '',
      address_zip: hc.address_zip || '',
      pastor_id: hc.pastor_id?.toString() || '',
      host_id: hc.host_id?.toString() || '',
      trainee_id: hc.trainee_id?.toString() || '',
      campus_name: hc.campus_name || '',
      pco_campus_id: hc.pco_campus_id || '',
    });
    setShowModal(true);
    setMessage('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setMessage('');

    try {
      const isEdit = !!form.id;
      const res = await fetch('/api/house-churches', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          pastor_id: form.pastor_id || null,
          host_id: form.host_id || null,
          trainee_id: form.trainee_id || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Request failed');
      }

      setShowModal(false);
      setMessage(isEdit ? t('hc.updated') : t('hc.created'));
      loadData();
    } catch (err) {
      console.error('HC save error:', err);
      setMessage(form.id ? t('hc.updateError') : t('hc.createError'));
    } finally {
      setSaving(false);
    }
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

  function renderModal() {
    return (
      <div className="verse-overlay" onClick={() => setShowModal(false)}>
        <div className="verse-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
          <div className="verse-modal-header">
            <h3>{form.id ? t('hc.edit') : t('hc.create')}</h3>
            <button className="verse-modal-close" onClick={() => setShowModal(false)}>✕</button>
          </div>
          <div className="verse-modal-body">
            <div className="form-group">
              <label>{t('hc.name')} *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="form-group">
              <label>{t('hc.description')}</label>
              <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>{t('hc.campus')}</label>
                <select className="form-select" value={form.campus_name} onChange={(e) => {
                  const campus = campuses.find(c => c.campus_name === e.target.value);
                  setForm({ ...form, campus_name: e.target.value, pco_campus_id: campus?.pco_campus_id || '' });
                }}>
                  <option value="">—</option>
                  {campuses.map((c) => (
                    <option key={c.pco_campus_id} value={c.campus_name}>{c.campus_name} ({c.member_count} {t('hc.members')})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('hc.meetingDay')}</label>
                <select className="form-select" value={form.meeting_day} onChange={(e) => setForm({ ...form, meeting_day: e.target.value })}>
                  <option value="">—</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>{t('hc.meetingTime')}</label>
                <input className="form-input" type="time" value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('hc.location')}</label>
                <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Smith Residence" />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                {t('hc.address')}
              </label>
              <div className="form-group">
                <input className="form-input" placeholder={t('hc.street')} value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <input className="form-input" placeholder={t('hc.city')} value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
                </div>
                <div className="form-group">
                  <input className="form-input" placeholder={t('hc.state')} value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value })} />
                </div>
                <div className="form-group">
                  <input className="form-input" placeholder={t('hc.zip')} value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                {t('hc.leadership')}
              </label>
              <div className="form-group">
                <label>{t('hc.pastor')}</label>
                <select className="form-select" value={form.pastor_id} onChange={(e) => setForm({ ...form, pastor_id: e.target.value })}>
                  <option value="">{t('hc.selectMember')}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('hc.host')}</label>
                <select className="form-select" value={form.host_id} onChange={(e) => setForm({ ...form, host_id: e.target.value })}>
                  <option value="">{t('hc.selectMember')}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('hc.trainee')}</label>
                <select className="form-select" value={form.trainee_id} onChange={(e) => setForm({ ...form, trainee_id: e.target.value })}>
                  <option value="">{t('hc.selectMember')}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? t('dashboard.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Grid view grouped by campus ---------- */
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

      {showModal && renderModal()}
    </div>
  );
}
