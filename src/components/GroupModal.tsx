'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/context/LangContext';
import { MEETING_DAYS, meetingDayLabel } from '@/lib/formatDate';

interface GroupData {
  id?: string | number;
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
  pastor_id: string | number | null;
  host_id: string | number | null;
  trainee_id: string | number | null;
}

interface MemberOption {
  id: string | number;
  first_name: string;
  last_name: string;
}

interface CampusOption {
  pco_campus_id: string;
  campus_name: string;
  member_count: number;
}

interface FormData {
  id?: string | number;
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


interface GroupModalProps {
  group: GroupData | null; // null = create mode
  members: MemberOption[];
  campuses: CampusOption[];
  onClose: () => void;
  onSaved: () => void;
}

export default function GroupModal({ group, members, campuses, onClose, onSaved }: GroupModalProps) {
  const { t } = useLang();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (group) {
      setForm({
        id: group.id,
        name: group.name || '',
        description: group.description || '',
        meeting_day: group.meeting_day || '',
        meeting_time: group.meeting_time || '',
        location: group.location || '',
        address_street: group.address_street || '',
        address_city: group.address_city || '',
        address_state: group.address_state || '',
        address_zip: group.address_zip || '',
        pastor_id: group.pastor_id?.toString() || '',
        host_id: group.host_id?.toString() || '',
        trainee_id: group.trainee_id?.toString() || '',
        campus_name: group.campus_name || '',
        pco_campus_id: group.pco_campus_id || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [group]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError('');

    try {
      const isEdit = !!form.id;
      const res = await fetch('/api/groups', {
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

      onSaved();
    } catch (err) {
      console.error('Group save error:', err);
      setError(form.id ? t('group.updateError') : t('group.createError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="verse-overlay" onClick={onClose}>
      <div className="verse-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="verse-modal-header">
          <h3>{form.id ? t('group.edit') : t('group.create')}</h3>
          <button className="verse-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="verse-modal-body">
          <div className="form-group">
            <label>{t('group.name')} *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="form-group">
            <label>{t('group.description')}</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>{t('group.campus')}</label>
              <select className="form-select" value={form.campus_name} onChange={(e) => {
                const campus = campuses.find(c => c.campus_name === e.target.value);
                setForm({ ...form, campus_name: e.target.value, pco_campus_id: campus?.pco_campus_id || '' });
              }}>
                <option value="">—</option>
                {campuses.map((c) => (
                  <option key={c.pco_campus_id} value={c.campus_name}>{c.campus_name} ({c.member_count} {t('group.members')})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('group.meetingDay')}</label>
              <select className="form-select" value={form.meeting_day} onChange={(e) => setForm({ ...form, meeting_day: e.target.value })}>
                <option value="">—</option>
                {MEETING_DAYS.map(d => <option key={d} value={d}>{meetingDayLabel(t, d)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>{t('group.meetingTime')}</label>
              <input className="form-input" type="time" value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} />
            </div>
            <div className="form-group">
              <label>{t('group.location')}</label>
              <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t('group.locationPlaceholder')} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              {t('group.address')}
            </label>
            <div className="form-group">
              <input className="form-input" placeholder={t('group.street')} value={form.address_street} onChange={(e) => setForm({ ...form, address_street: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <input className="form-input" placeholder={t('group.city')} value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} />
              </div>
              <div className="form-group">
                <input className="form-input" placeholder={t('group.state')} value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value })} />
              </div>
              <div className="form-group">
                <input className="form-input" placeholder={t('group.zip')} value={form.address_zip} onChange={(e) => setForm({ ...form, address_zip: e.target.value })} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              {t('group.leadership')}
            </label>
            <div className="form-group">
              <label>{t('group.pastor')}</label>
              <select className="form-select" value={form.pastor_id} onChange={(e) => setForm({ ...form, pastor_id: e.target.value })}>
                <option value="">{t('group.selectMember')}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('group.host')}</label>
              <select className="form-select" value={form.host_id} onChange={(e) => setForm({ ...form, host_id: e.target.value })}>
                <option value="">{t('group.selectMember')}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('group.trainee')}</label>
              <select className="form-select" value={form.trainee_id} onChange={(e) => setForm({ ...form, trainee_id: e.target.value })}>
                <option value="">{t('group.selectMember')}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '8px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? t('dashboard.loading') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
