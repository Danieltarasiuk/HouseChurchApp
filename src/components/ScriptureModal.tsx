'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLang } from '@/context/LangContext';

// Verse cache to store fetched scripture text
const verseCache: { [key: string]: { ref: string; text: string }[] } = {};

interface ScriptureModalProps {
  reference: string;
  lang: string;
  onClose: () => void;
}

/**
 * Expand compound references like "Genesis 1:26-27; 2:7" into
 * ["Genesis 1:26-27", "Genesis 2:7"]. Carries the book name forward
 * when a subsequent part starts with a digit (same-book shorthand).
 */
function expandRefs(raw: string): string[] {
  const parts = raw.split(';').map(r => r.trim()).filter(Boolean);
  let lastBook = '';
  return parts.map(part => {
    // Same-book shorthand: starts with chapter:verse like "2:7" or "10:9"
    // but NOT a numbered book name like "1 John" or "2 Corinthians"
    if (/^\d+:/.test(part) || /^\d+\s*-\s*\d+$/.test(part)) {
      return `${lastBook} ${part}`;
    }
    // Extract book name (everything before the chapter:verse pattern)
    const match = part.match(/^(.+?)\s*\d+[:\s]/);
    if (match) lastBook = match[1].trim();
    return part;
  });
}

export default function ScriptureModal({
  reference,
  lang,
  onClose,
}: ScriptureModalProps) {
  const { t } = useLang();
  const [passages, setPassages] = useState<{ ref: string; text: string }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `${reference}|${lang}`;

    if (verseCache[cacheKey]) {
      setPassages(verseCache[cacheKey]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    const refs = expandRefs(reference);
    const apiBase = lang === 'es' ? '/api/scripture/nbla' : '/api/scripture/esv';

    Promise.all(
      refs.map(ref =>
        fetch(`${apiBase}?ref=${encodeURIComponent(ref)}`)
          .then(res => res.json())
          .then(data => {
            if (data.error || !data.text) {
              return { ref, text: t('scripture.unavailable').replace('{ref}', ref) };
            }
            return { ref, text: data.text };
          })
          .catch(() => ({ ref, text: t('scripture.unavailable').replace('{ref}', ref) }))
      )
    ).then(results => {
      if (cancelled) return;
      verseCache[cacheKey] = results;
      setPassages(results);
      setLoading(false);
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
              {passages && passages.map((p, i) => (
                <div key={i}>
                  {i > 0 && <hr style={{ margin: '12px 0', borderColor: 'var(--border)' }} />}
                  <p style={{ whiteSpace: 'pre-line' }}>{p.text}</p>
                  {passages.length > 1 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic', marginTop: '4px' }}>
                      — {p.ref}
                    </p>
                  )}
                </div>
              ))}
              <p className="verse-note">{t('disc.verseNote')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
