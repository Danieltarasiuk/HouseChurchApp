'use client';

import { useState } from 'react';
import { useChurch } from '@/context/ChurchContext';
import { useLang } from '@/context/LangContext';

/**
 * The current church, and a menu to switch to another. Shown only to users
 * with more than one church and to platform admins. Switching sets the
 * church cookie on the server (POST /api/church/current, which checks the
 * membership) and reloads, so every page and the session pick it up.
 */
export function ChurchSwitcher() {
  const { church, options, canSwitch } = useChurch();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!canSwitch || !church) return null;

  const switchTo = async (churchId: string) => {
    if (churchId === church.id) return;
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch('/api/church/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ churchId }),
      });
      if (!res.ok) throw new Error();
      window.location.assign('/dashboard');
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="church-switcher" data-testid="church-switcher">
      <label htmlFor="church-switcher-select">{t('church.switchLabel')}</label>
      <select
        id="church-switcher-select"
        className="form-input"
        value={church.id}
        disabled={busy}
        onChange={(e) => switchTo(e.target.value)}
      >
        {/* A platform admin may be in a church that is not in their list. */}
        {!options.some((o) => o.id === church.id) && <option value={church.id}>{church.name}</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {failed && <div role="alert" className="church-switcher-error">{t('church.switchError')}</div>}
    </div>
  );
}
