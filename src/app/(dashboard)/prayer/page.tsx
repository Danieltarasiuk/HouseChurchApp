'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';

interface PrayerRequest {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'answered';
  is_private: number;
  created_at: string;
  user_id: number;
  requester_name: string;
}

export default function PrayerPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<'active' | 'answered'>('active');
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrivate, setFormPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/prayer')
      .then((res) => res.json())
      .then((data) => setPrayers(data.prayers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = prayers.filter((p) => p.status === 'active');
  const answered = prayers.filter((p) => p.status === 'answered');
  const displayed = tab === 'active' ? active : answered;

  async function handleMarkAnswered(id: number) {
    const res = await fetch('/api/prayer', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'answered' }),
    });
    if (res.ok) {
      setPrayers((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'answered' as const } : p))
      );
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
        body: JSON.stringify({ title: formTitle, description: formDesc, is_private: formPrivate }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrayers((prev) => [data.prayer, ...prev]);
        setFormTitle('');
        setFormDesc('');
        setFormPrivate(false);
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>{t('pray.title')}</h2>
        <p>{t('pray.sub')}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${tab === 'active' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('active')}
          >
            {t('pray.active')} ({active.length})
          </button>
          <button
            className={`btn ${tab === 'answered' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab('answered')}
          >
            {t('pray.answered')} ({answered.length})
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
              <input
                id="pray-title"
                className="form-input"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="pray-desc">{t('pray.requestDesc')}</label>
              <textarea
                id="pray-desc"
                className="form-input"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="private-check"
                checked={formPrivate}
                onChange={(e) => setFormPrivate(e.target.checked)}
              />
              <label htmlFor="private-check">{t('pray.private')}</label>
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
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {t('dashboard.loading')}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('pray.noRequests')}</p>
        </div>
      ) : (
        displayed.map((prayer) => (
          <div className="card" key={prayer.id} style={{ padding: '20px', marginBottom: '12px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className="card-title">{prayer.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '4px 0' }}>
                  {prayer.requester_name || t('dashboard.anonymous')}
                  {' '}&middot; {new Date(prayer.created_at).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {prayer.is_private === 1 && (
                  <span className="badge badge-private">
                    {t('pray.private')}
                  </span>
                )}
                <span className={`badge ${prayer.status === 'active' ? 'badge-active' : 'badge-answered'}`}>
                  {prayer.status === 'active' ? t('pray.active') : t('pray.answered')}
                </span>
              </div>
            </div>
            {prayer.description && (
              <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
                {prayer.description}
              </p>
            )}
            {prayer.status === 'active' && (
              <div style={{ marginTop: '12px' }}>
                <button className="btn btn-ghost" onClick={() => handleMarkAnswered(prayer.id)}>
                  {t('pray.markAnswered')}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
