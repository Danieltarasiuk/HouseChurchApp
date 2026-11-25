'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLang } from '@/context/LangContext';
import {
  DIRECTORY_FIELDS, VISIBILITY_LEVELS,
  type DirectoryField, type Effective, type VisibilityLevel, type VisibilityScope,
} from '@/lib/directoryTypes';

interface FieldView {
  value: VisibilityLevel | null;
  effective: Effective;
  ceiling: Effective | null;
}

interface Props {
  scope: VisibilityScope;
  /** Group or member id; omit for 'church' and 'member_self'. */
  id?: string;
  /** Rendered above the table when the viewer may edit this layer. */
  title?: string;
  description?: string;
}

const rank = (l: VisibilityLevel) => VISIBILITY_LEVELS.indexOf(l);

/**
 * Directory privacy settings for one layer (church default, a group,
 * a member, or the viewer's own). Each row shows the level in effect and the
 * layer causing it; options looser than the layers above are disabled, since
 * the tightest layer always wins. Renders nothing when the server says the
 * viewer may not manage this layer, so pages can include it unconditionally.
 */
export function PrivacyControls({ scope, id, title, description }: Props) {
  const { t } = useLang();
  const [fields, setFields] = useState<Record<DirectoryField, FieldView> | null>(null);
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState<DirectoryField | null>(null);
  const [error, setError] = useState('');

  const query = new URLSearchParams({ scope, ...(id ? { id } : {}) }).toString();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/directory-visibility?${query}`);
      if (res.status === 403 || res.status === 404) { setHidden(true); return; }
      if (!res.ok) throw new Error();
      setFields((await res.json()).fields);
    } catch {
      setError(t('privacy.loadError'));
    }
  }, [query, t]);

  useEffect(() => { load(); }, [load]);

  const save = async (field: DirectoryField, level: VisibilityLevel | null) => {
    setSaving(field);
    setError('');
    try {
      const res = await fetch('/api/directory-visibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, id, field, level }),
      });
      if (!res.ok) throw new Error();
      setFields((await res.json()).fields);
    } catch {
      setError(t('privacy.saveError'));
    } finally {
      setSaving(null);
    }
  };

  if (hidden) return null;

  const describeEffective = (e: Effective) =>
    t('privacy.inEffect')
      .replace('{level}', t('privacy.level.' + e.level))
      .replace('{source}', t('privacy.source.' + e.source));

  return (
    <div className="privacy-controls">
      {title && <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{title}</h3>}
      {description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{description}</p>}
      {error && <div className="settings-alert settings-alert-error" role="alert">{error}</div>}
      {!fields ? (
        !error && <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{t('dashboard.loading')}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('privacy.field')}</th>
                <th>{t('privacy.thisSetting')}</th>
                <th className="col-hide-mobile">{t('privacy.effective')}</th>
              </tr>
            </thead>
            <tbody>
              {DIRECTORY_FIELDS.map((field) => {
                const f = fields[field];
                const label = t('privacy.field.' + field);
                return (
                  <tr key={field}>
                    <td>{label}</td>
                    <td>
                      <select
                        className="form-input"
                        aria-label={`${label}: ${t('privacy.thisSetting')}`}
                        value={f.value ?? ''}
                        disabled={saving === field}
                        onChange={(e) => save(field, (e.target.value || null) as VisibilityLevel | null)}
                        style={{ minWidth: 0, width: '100%', maxWidth: '220px' }}
                      >
                        <option value="">{t(scope === 'church' ? 'privacy.notSetChurch' : 'privacy.notSet')}</option>
                        {VISIBILITY_LEVELS.map((level) => (
                          <option
                            key={level}
                            value={level}
                            // Looser than a layer above: it could never take effect.
                            disabled={!!f.ceiling && rank(level) > rank(f.ceiling.level)}
                          >
                            {t('privacy.level.' + level)}
                          </option>
                        ))}
                      </select>
                      {/* Small screens: "In effect" under the dropdown instead of a third column. */}
                      <div className="privacy-effective-inline">{describeEffective(f.effective)}</div>
                    </td>
                    <td className="col-hide-mobile" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{describeEffective(f.effective)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>{t('privacy.levelsHelp')}</p>
    </div>
  );
}
