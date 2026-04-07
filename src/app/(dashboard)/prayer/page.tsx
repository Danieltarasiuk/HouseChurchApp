'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';
import { Trash2 } from 'lucide-react';

interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'praying' | 'answered';
  visibility: 'public' | 'house_church' | 'private';
  created_at: string;
  user_id: string;
  requester_name: string;
}

export default function PrayerPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<'active' | 'praying' | 'answered'>('active');
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formVisibility, setFormVisibility] = useState<string>('public');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/prayer')
      .then((res) => res.json())
      .then((data) => setPrayers(data.prayers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = prayers.filter((p) => p.status === 'active');
  const praying = prayers.filter((p) => p.status === 'praying');
  const answered = prayers.filter((p) => p.status === 'answered');
  const displayed = tab === 'active' ? active : tab === 'praying' ? praying : answered;

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
    setSubmitting(true);

    try {
      const res = await fetch('/api/prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, description: formDesc, visibility: formVisibility }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrayers((prev) => [data.prayer, ...prev]);
        setFormTitle('');
        setFormDesc('');
        setFormVisibility('public');
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const visIcon = (v: string) => v === 'public' ? '\uD83C\uDF10' : v === 'house_church' ? '\uD83C\uDFE0' : '\uD83D\uDD12';
  const visLabel = (v: string) => v === 'public' ? t('pray.public') : v === 'house_church' ? t('pray.houseChurch') : t('pray.privateLabel');
  const statusBadgeClass = (s: string) => s === 'active' ? 'badge-active' : s === 'praying' ? 'badge-praying' : 'badge-answered';
  const statusLabel = (s: string) => s === 'active' ? t('pray.statusActive') : s === 'praying' ? t('pray.statusPraying') : t('pray.statusAnswered');

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
          <button className={`btn ${tab === 'praying' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('praying')}>
            {t('pray.tabPraying')} ({praying.length})
          </button>
          <button className={`btn ${tab === 'answered' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('answered')}>
            {t('pray.tabAnswered')} ({answered.length})
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {t('pray.newRequest')}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
          <form onSubmit={handleSubmit}>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {t('pray.submit')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
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
                  {prayer.requester_name || ''} &middot; {new Date(prayer.created_at).toLocaleDateString()}
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
              {['active', 'praying', 'answered'].map(s => (
                <button
                  key={s}
                  className={`btn ${prayer.status === s ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: '12px', padding: '4px 12px' }}
                  onClick={() => handleStatusChange(prayer.id, s)}
                  disabled={prayer.status === s}
                >
                  {s === 'active' ? t('pray.statusActive') : s === 'praying' ? t('pray.statusPraying') : t('pray.statusAnswered')}
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
