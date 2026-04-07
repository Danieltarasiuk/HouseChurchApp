'use client';

import { useState } from 'react';
import { useLang } from '@/context/LangContext';
import { MOCK_PRAYERS, PrayerRequest } from '@/data/mock-data';

const loc = (obj: { en: string; es: string }, lang: string) =>
  obj[lang as 'en' | 'es'] || obj.en;

export default function PrayerPage() {
  const { t, language } = useLang();
  const [tab, setTab] = useState<'active' | 'answered'>('active');
  const [prayers, setPrayers] = useState<PrayerRequest[]>(MOCK_PRAYERS);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrivate, setFormPrivate] = useState(false);

  const active = prayers.filter((p) => p.status === 'active');
  const answered = prayers.filter((p) => p.status === 'answered');
  const displayed = tab === 'active' ? active : answered;

  function handleMarkAnswered(id: number) {
    setPrayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'answered' as const } : p))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const newRequest: PrayerRequest = {
      id: Date.now(),
      title: { en: formTitle, es: formTitle },
      description: { en: formDesc, es: formDesc },
      first_name: t('sidebar.user'),
      last_name: '',
      house_church_name: '',
      status: 'active',
      is_private: formPrivate ? 1 : 0,
      created_at: new Date().toISOString().slice(0, 10),
      user_id: 0,
    };
    setPrayers((prev) => [newRequest, ...prev]);
    setFormTitle('');
    setFormDesc('');
    setFormPrivate(false);
    setShowForm(false);
  }

  return (
    <div>
      <div className="page-header">
        <h2>{t('pray.title')}</h2>
        <p>{t('pray.sub')}</p>
      </div>

      {/* Toolbar: tabs + new request button */}
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

      {/* Inline new request form */}
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
              <button type="submit" className="btn btn-primary">
                {t('pray.submit')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Prayer cards */}
      {displayed.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>{t('pray.noRequests')}</p>
        </div>
      ) : (
        displayed.map((prayer) => (
          <div className="card" key={prayer.id} style={{ padding: '20px', marginBottom: '12px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className="card-title">{loc(prayer.title, language)}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '4px 0' }}>
                  {prayer.first_name} {prayer.last_name}
                  {prayer.house_church_name && <> &middot; {prayer.house_church_name}</>}
                  {' '}&middot; {prayer.created_at}
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
            <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
              {loc(prayer.description, language)}
            </p>
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
