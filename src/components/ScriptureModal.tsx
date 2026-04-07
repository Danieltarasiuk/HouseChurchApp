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

    // Simulate verse lookup with placeholder text
    // In production, this would call the ESV API (en) or a NBLA source (es)
    setLoading(true);
    const timer = setTimeout(() => {
      const placeholder =
        lang === 'es'
          ? `[Texto de ${reference} — NBLA]\n\nEn la versión de producción, el texto completo del versículo se cargará automáticamente desde la Biblia NBLA.`
          : `[Text of ${reference} — ESV]\n\nIn the production version, the full verse text will load automatically from the ESV Bible.`;

      verseCache[cacheKey] = placeholder;
      setText(placeholder);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
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
