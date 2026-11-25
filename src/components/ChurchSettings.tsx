'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLang } from '@/context/LangContext';

interface ChurchForm {
  name: string;
  timezone: string;
  default_language: 'en' | 'es';
  group_label_singular_en: string;
  group_label_plural_en: string;
  group_label_singular_es: string;
  group_label_plural_es: string;
  checkins_event_name: string;
  church_center_url: string;
}

const LABEL_FIELDS = [
  ['group_label_singular_en', 'church.labelSingularEn'],
  ['group_label_plural_en', 'church.labelPluralEn'],
  ['group_label_singular_es', 'church.labelSingularEs'],
  ['group_label_plural_es', 'church.labelPluralEs'],
] as const;

/**
 * Settings → Church (admins): name, timezone, default language, the group
 * label in both languages, the Check-Ins event name and the Church Center
 * URL. Saving reloads the page so the new label and timezone apply
 * everywhere. Logo and colours are PR 1.2.
 */
export function ChurchSettings() {
  const { t } = useLang();
  const [form, setForm] = useState<ChurchForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const timeZones = useMemo<string[]>(() => {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    try { return intl.supportedValuesOf?.('timeZone') ?? []; } catch { return []; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/church')
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const { church } = await res.json();
        if (cancelled) return;
        setForm({
          name: church.name ?? '',
          timezone: church.timezone ?? '',
          default_language: church.default_language === 'es' ? 'es' : 'en',
          group_label_singular_en: church.group_label_singular_en ?? '',
          group_label_plural_en: church.group_label_plural_en ?? '',
          group_label_singular_es: church.group_label_singular_es ?? '',
          group_label_plural_es: church.group_label_plural_es ?? '',
          checkins_event_name: church.checkins_event_name ?? '',
          church_center_url: church.church_center_url ?? '',
        });
      })
      .catch(() => { if (!cancelled) setMessage({ kind: 'error', text: t('church.loadError') }); });
    return () => { cancelled = true; };
  }, [t]);

  const set = (field: keyof ChurchForm, value: string) => setForm((f) => (f ? { ...f, [field]: value } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    try {
      const res = await fetch('/api/church', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.fields)) {
          setFieldErrors(Object.fromEntries(data.fields.map((f: { field: string; reason: string }) => [f.field, t('church.err.' + f.reason)])));
        }
        throw new Error();
      }
      setMessage({ kind: 'success', text: t('church.saved') });
      // The label, timezone and giving link are read when the page loads.
      window.location.reload();
    } catch {
      setMessage({ kind: 'error', text: t('church.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (f: string) =>
    fieldErrors[f] ? <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{fieldErrors[f]}</div> : null;

  return (
    <div className="card card-padded church-settings" style={{ marginBottom: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{t('church.title')}</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{t('church.desc')}</p>
      {message && (
        <div className={`settings-alert settings-alert-${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      )}
      {!form ? (
        !message && <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('dashboard.loading')}</p>
      ) : (
        <div className="church-settings-grid">
          <div className="form-group">
            <label htmlFor="church-name">{t('church.name')}</label>
            <input id="church-name" className="form-input" value={form.name} maxLength={100} onChange={(e) => set('name', e.target.value)} />
            {fieldError('name')}
          </div>
          <div className="form-group">
            <label htmlFor="church-tz">{t('church.timezone')}</label>
            <input id="church-tz" className="form-input" list="church-tz-list" value={form.timezone} onChange={(e) => set('timezone', e.target.value)} />
            <datalist id="church-tz-list">{timeZones.map((z) => <option key={z} value={z} />)}</datalist>
            {fieldError('timezone')}
          </div>
          <div className="form-group">
            <label htmlFor="church-lang">{t('church.defaultLanguage')}</label>
            <select id="church-lang" className="form-input" value={form.default_language} onChange={(e) => set('default_language', e.target.value)}>
              <option value="en">{t('church.lang.en')}</option>
              <option value="es">{t('church.lang.es')}</option>
            </select>
          </div>
          <fieldset className="church-settings-labels">
            <legend>{t('church.groupLabels')}</legend>
            {LABEL_FIELDS.map(([field, key]) => (
              <div className="form-group" key={field}>
                <label htmlFor={`church-${field}`}>{t(key)}</label>
                <input id={`church-${field}`} className="form-input" value={form[field]} maxLength={40} onChange={(e) => set(field, e.target.value)} />
                {fieldError(field)}
              </div>
            ))}
          </fieldset>
          <div className="form-group">
            <label htmlFor="church-checkins">{t('church.checkinsEvent')}</label>
            <input id="church-checkins" className="form-input" value={form.checkins_event_name} maxLength={100} onChange={(e) => set('checkins_event_name', e.target.value)} />
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('church.checkinsHelp')}</div>
            {fieldError('checkins_event_name')}
          </div>
          <div className="form-group">
            <label htmlFor="church-cc">{t('church.churchCenterUrl')}</label>
            <input id="church-cc" className="form-input" type="url" placeholder="https://yourchurch.churchcenter.com" value={form.church_center_url} onChange={(e) => set('church_center_url', e.target.value)} />
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('church.churchCenterHelp')}</div>
            {fieldError('church_center_url')}
          </div>
          <div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? t('pastoral.saving') : t('church.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
