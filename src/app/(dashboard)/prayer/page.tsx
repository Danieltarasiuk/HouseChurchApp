'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useLang } from '@/context/LangContext';
import { Trash2, ChevronDown } from 'lucide-react';

interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'answered';
  visibility: 'public' | 'house_church' | 'private';
  created_at: string;
  user_id: string;
  requester_name: string;
  member_id?: string | null;
  member_name?: string | null;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
}

export default function PrayerPage() {
  const { t } = useLang();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isPastor = userRole === 'admin' || userRole === 'house_church_pastor';

  const [tab, setTab] = useState<'active' | 'answered'>('active');
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formVisibility, setFormVisibility] = useState<string>('public');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // On-behalf state
  const [onBehalf, setOnBehalf] = useState(false);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const memberSearchRef = useRef<HTMLDivElement>(null);

  // Dropdown menu for new request button
  const [showNewMenu, setShowNewMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/prayer')
      .then((res) => res.json())
      .then((data) => setPrayers(data.prayers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch members for on-behalf (pastors/admins only)
  useEffect(() => {
    if (isPastor) {
      fetch('/api/members')
        .then(r => r.json())
        .then(data => setAllMembers(data.members || []))
        .catch(() => {});
    }
  }, [isPastor]);

  // Close dropdown menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
      if (memberSearchRef.current && !memberSearchRef.current.contains(e.target as Node)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const active = prayers.filter((p) => p.status === 'active');
  const answered = prayers.filter((p) => p.status === 'answered');
  const displayed = tab === 'active' ? active : answered;

  const filteredMembers = allMembers.filter(m => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return `${m.first_name} ${m.last_name}`.toLowerCase().includes(q);
  });

  function openFormForMyself() {
    setOnBehalf(false);
    setSelectedMember(null);
    setMemberSearch('');
    setFormVisibility('public');
    setShowForm(true);
    setShowNewMenu(false);
  }

  function openFormOnBehalf() {
    setOnBehalf(true);
    setSelectedMember(null);
    setMemberSearch('');
    setFormVisibility('private');
    setShowForm(true);
    setShowNewMenu(false);
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch('/api/prayer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setPrayers((prev) => prev.map((p) => (p.id === id ? { ...p, status: status as PrayerRequest['status'] } : p)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('pray.deleteConfirm'))) return;
    const res = await fetch(`/api/prayer/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPrayers((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || submitting) return;
    if (onBehalf && !selectedMember) return;
    setSubmitting(true);
    setFormError('');

    try {
      const payload: Record<string, string | null> = {
        title: formTitle,
        description: formDesc,
        visibility: formVisibility,
      };
      if (onBehalf && selectedMember) {
        payload.member_id = selectedMember.id;
      }

      const res = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setPrayers((prev) => [data.prayer, ...prev]);
        setFormTitle('');
        setFormDesc('');
        setFormVisibility('public');
        setSelectedMember(null);
        setMemberSearch('');
        setOnBehalf(false);
        setShowForm(false);
      } else {
        setFormError(data.error || t('pray.submitError'));
      }
    } catch {
      setFormError(t('pray.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  const visIcon = (v: string) => v === 'public' ? '\uD83C\uDF10' : v === 'house_church' ? '\uD83C\uDFE0' : '\uD83D\uDD12';
  const visLabel = (v: string) => v === 'public' ? t('pray.public') : v === 'house_church' ? t('pray.houseChurch') : t('pray.privateLabel');
  const statusBadgeClass = (s: string) => s === 'answered' ? 'badge-answered' : 'badge-active';
  const statusLabel = (s: string) => s === 'answered' ? t('pray.statusAnswered') : t('pray.statusActive');

  function renderRequesterLine(prayer: PrayerRequest) {
    if (isPastor) {
      // Pastors see "Submitter — on behalf of Member" when both exist and differ
      if (prayer.member_name && prayer.requester_name && prayer.member_name !== prayer.requester_name) {
        return `${prayer.requester_name} \u2014 ${t('pray.submittedBy')} ${prayer.member_name}`;
      }
      return prayer.requester_name || '';
    }
    // Regular members: show member_name if it exists, otherwise requester_name
    if (prayer.member_name) return prayer.member_name;
    return prayer.requester_name || '';
  }

  return (
    <div>
      <div className="page-header">
        <h2>{t('pray.title')}</h2>
        <p>{t('pray.sub')}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${tab === 'active' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('active')}>
            {t('pray.tabActive')} ({active.length})
          </button>
          <button className={`btn ${tab === 'answered' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('answered')}>
            {t('pray.tabAnswered')} ({answered.length})
          </button>
        </div>

        {isPastor ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex' }}>
              <button
                className="btn btn-primary"
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                onClick={openFormForMyself}
              >
                {t('pray.newRequest')}
              </button>
              <button
                className="btn btn-primary"
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: '1px solid rgba(255,255,255,0.3)', padding: '0 8px' }}
                onClick={() => setShowNewMenu(!showNewMenu)}
              >
                <ChevronDown size={14} />
              </button>
            </div>
            {showNewMenu && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: '4px',
                background: 'var(--card-bg, #fff)', border: '1px solid var(--border)',
                borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: '200px', zIndex: 50, overflow: 'hidden',
              }}>
                <button
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}
                  onClick={openFormForMyself}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {t('pray.forMyself')}
                </button>
                <button
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}
                  onClick={openFormOnBehalf}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {t('pray.forMember')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary" onClick={openFormForMyself}>
            {t('pray.newRequest')}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <form onSubmit={handleSubmit}>
            {/* On-behalf member selector */}
            {onBehalf && (
              <div className="form-group">
                {selectedMember ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg)', borderRadius: '6px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px' }}>
                      <strong>{t('pray.onBehalfOf')}</strong> {selectedMember.first_name} {selectedMember.last_name}
                    </span>
                    <button
                      type="button"
                      style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '16px' }}
                      onClick={() => { setSelectedMember(null); setMemberSearch(''); }}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div ref={memberSearchRef} style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t('pray.searchMember')}
                      value={memberSearch}
                      onChange={e => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                      onFocus={() => setShowMemberDropdown(true)}
                    />
                    {showMemberDropdown && memberSearch.trim() && (
                      <div style={{
                        position: 'absolute', left: 0, right: 0, top: '100%', marginTop: '2px',
                        background: 'var(--card-bg, #fff)', border: '1px solid var(--border)',
                        borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        maxHeight: '200px', overflowY: 'auto', zIndex: 50,
                      }}>
                        {filteredMembers.length === 0 ? (
                          <div style={{ padding: '10px 12px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                            {t('common.noResults')}
                          </div>
                        ) : (
                          filteredMembers.slice(0, 20).map(m => (
                            <button
                              key={m.id}
                              type="button"
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}
                              onClick={() => { setSelectedMember(m); setMemberSearch(''); setShowMemberDropdown(false); }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              {m.first_name} {m.last_name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="pray-title">{t('pray.requestTitle')}</label>
              <input id="pray-title" className="form-input" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="pray-desc">{t('pray.requestDesc')}</label>
              <textarea id="pray-desc" className="form-input" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} />
            </div>
            <div className="form-group">
              <label>{t('pray.visibility')}</label>
              <select className="form-select" value={formVisibility} onChange={(e) => setFormVisibility(e.target.value)}>
                <option value="public">{visIcon('public')} {t('pray.public')}</option>
                <option value="house_church">{visIcon('house_church')} {t('pray.houseChurch')}</option>
                <option value="private">{visIcon('private')} {t('pray.privateLabel')}</option>
              </select>
            </div>
            {formError && (
              <p style={{ color: 'var(--danger, #dc2626)', fontSize: '13px', marginBottom: '8px' }}>{formError}</p>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting || (onBehalf && !selectedMember)}>
                {t('pray.submit')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setOnBehalf(false); setSelectedMember(null); setMemberSearch(''); }}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>{t('dashboard.loading')}</div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('pray.noRequests')}</p>
        </div>
      ) : (
        displayed.map((prayer) => (
          <div className="card" key={prayer.id} style={{ padding: '20px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{prayer.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                  {renderRequesterLine(prayer)} &middot; {new Date(prayer.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                <span className="badge badge-member" style={{ fontSize: '11px' }} title={visLabel(prayer.visibility)}>
                  {visIcon(prayer.visibility)} {visLabel(prayer.visibility)}
                </span>
                <span className={`badge ${statusBadgeClass(prayer.status)}`}>
                  {statusLabel(prayer.status)}
                </span>
              </div>
            </div>
            {prayer.description && (
              <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                {prayer.description}
              </p>
            )}
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {['active', 'answered'].map(s => (
                <button
                  key={s}
                  className={`btn ${prayer.status === s ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                  onClick={() => handleStatusChange(prayer.id, s)}
                  disabled={prayer.status === s}
                >
                  {s === 'answered' ? t('pray.statusAnswered') : t('pray.statusActive')}
                </button>
              ))}
              <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--danger, #dc2626)' }} onClick={() => handleDelete(prayer.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
