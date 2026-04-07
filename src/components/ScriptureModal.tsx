'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLang } from '@/context/LangContext';

// Verse cache to store fetched scripture text
const verseCache: { [key: string]: string } = {};

interface ScriptureModalProps {
  reference: string;
  lang: string;
  onClose: () => void;
}

export default function ScriptureModal({
  reference,
  lang,
  onClose,
}: ScriptureModalProps) {
  const { t } = useLang();
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `${reference}|${lang}`;

    // Check if verse is already cached
    if (verseCache[cacheKey]) {
      setText(verseCache[cacheKey]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    const endpoint = lang === 'es'
      ? `/api/scripture/nbla?ref=${encodeURIComponent(reference)}`
      : `/api/scripture/esv?ref=${encodeURIComponent(reference)}`;

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error || !data.text) {
          const fallback = lang === 'es'
            ? `Texto no disponible. Por favor busca ${reference} en tu Biblia.`
            : `Verse text unavailable. Please look up ${reference} in your Bible.`;
          verseCache[cacheKey] = fallback;
          setText(fallback);
        } else {
          verseCache[cacheKey] = data.text;
          setText(data.text);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = lang === 'es'
          ? `Texto no disponible. Por favor busca ${reference} en tu Biblia.`
          : `Verse text unavailable. Please look up ${reference} in your Bible.`;
        verseCache[cacheKey] = fallback;
        setText(fallback);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reference, lang]);

  return (
    <div className="verse-overlay" onClick={onClose}>
      <div className="verse-modal" onClick={(e) => e.stopPropagation()}>
        <div className="verse-modal-header">
          <h3>{reference}</h3>
          <button
            className="verse-modal-close"
            onClick={onClose}
            aria-label={t('disc.close')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="verse-modal-body">
          {loading ? (
            <p className="verse-loading">{t('disc.loading')}</p>
          ) : (
            <div>
              <p style={{ whiteSpace: 'pre-line' }}>{text}</p>
              <p className="verse-note">{t('disc.verseNote')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
