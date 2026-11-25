'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '@/context/LangContext';
import ScriptureModal from '@/components/ScriptureModal';
import { NoAccess } from '@/components/NoAccess';
import { INCUBATOR_CURRICULUM, loc } from '@/data/incubator-curriculum';
import type { IncubatorBody } from '@/data/incubator-bodies';

/** One module of the selected day, from /api/incubator/day. */
interface ModuleData {
  body: IncubatorBody | null;
  answers: Record<string, string>;
  completed: boolean;
}

const SECTION_COLORS: Record<string, string> = {
  character: '#00C853',
  doctrine: '#2979FF',
  convictions: '#FF6D00',
};

interface VerseModalState {
  reference: string;
}

interface AnswersState {
  [key: string]: string;
}

export default function IncubatorPage() {
  const { language: lang, t } = useLang();
  const [weekIdx, setWeekIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [verseModal, setVerseModal] = useState<VerseModalState | null>(null);
  // Lesson text and saved answers come from the API (access-checked).
  const [modules, setModules] = useState<ModuleData[] | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const week = INCUBATOR_CURRICULUM.weeks[weekIdx];
  const currentDay = week.days[dayIdx];
  const section = week.section;
  const sectionColor = SECTION_COLORS[section];

  const handleWeekChange = (idx: number) => {
    setWeekIdx(idx);
    setDayIdx(0);
    setLoadState('loading');
  };
  const handleDayChange = (idx: number) => {
    setDayIdx(idx);
    setLoadState('loading');
  };

  // Load the day's lesson text and saved answers.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/incubator/day?week=${weekIdx + 1}&day=${dayIdx + 1}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) { setLoadState('denied'); return; }
        if (!res.ok) { setLoadState('error'); return; }
        const data: { modules: ModuleData[] } = await res.json();
        if (cancelled) return;
        setModules(data.modules);
        setAnswers((prev) => {
          const next = { ...prev };
          data.modules.forEach((m, mi) => {
            for (const [qi, text] of Object.entries(m.answers)) next[`${weekIdx}-${dayIdx}-${mi}-${qi}`] = text;
          });
          return next;
        });
        setLoadState('ready');
      })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [weekIdx, dayIdx]);

  // Save one module's answers (all of them; emptied ones are dropped), debounced.
  const saveModule = useCallback((all: AnswersState, wIdx: number, dIdx: number, mi: number) => {
    const key = `${wIdx}-${dIdx}-${mi}`;
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      const prefix = `${key}-`;
      const moduleAnswers: Record<string, string> = {};
      for (const [k, v] of Object.entries(all)) if (k.startsWith(prefix)) moduleAnswers[k.slice(prefix.length)] = v;
      setSavingState('saving');
      fetch('/api/incubator/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: wIdx + 1, day: dIdx + 1, module: mi, answers: moduleAnswers }),
      })
        .then((res) => setSavingState(res.ok ? 'saved' : 'error'))
        .catch(() => setSavingState('error'));
    }, 600);
  }, []);

  const answerKey = (mi: number, qi: number): string =>
    `${weekIdx}-${dayIdx}-${mi}-${qi}`;
  const getAnswer = (mi: number, qi: number): string =>
    answers[answerKey(mi, qi)] || '';
  const setAnswer = (mi: number, qi: number, val: string) => {
    const next = { ...answers, [answerKey(mi, qi)]: val };
    setAnswers(next);
    saveModule(next, weekIdx, dayIdx, mi);
  };

  const sectionLabel = (s: string) => {
    switch (s) {
      case 'character': return t('inc.character');
      case 'doctrine': return t('inc.doctrine');
      case 'convictions': return t('inc.convictions');
      default: return s;
    }
  };

  if (loadState === 'denied') {
    return (
      <div>
        <div className="page-header"><h2>{t('inc.title')}</h2></div>
        <NoAccess />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>{t('inc.title')}</h2>
        <p>{t('inc.sub')}</p>
      </div>

      {savingState !== 'idle' && (
        <div style={{ fontSize: '13px', color: savingState === 'error' ? 'var(--danger)' : 'var(--text-tertiary)', marginBottom: '12px' }} role="status">
          {savingState === 'saving' ? t('pastoral.saving') : savingState === 'saved' ? t('pastoral.saved') : t('inc.saveError')}
        </div>
      )}
      {loadState === 'error' && (
        <div className="settings-alert settings-alert-error" role="alert">{t('inc.loadError')}</div>
      )}

      {/* Week Tabs */}
      <div className="disc-week-tabs">
        {INCUBATOR_CURRICULUM.weeks.map((w, i) => (
          <button
            key={i}
            className={`disc-week-tab ${weekIdx === i ? 'active' : ''}`}
            style={weekIdx === i ? { borderColor: SECTION_COLORS[w.section], background: SECTION_COLORS[w.section], color: 'white' } : {}}
            onClick={() => handleWeekChange(i)}
          >
            {t('inc.week')} {w.number}
          </button>
        ))}
      </div>

      {/* Section + Week Title */}
      <div className="inc-section-banner" style={{ borderLeftColor: sectionColor }}>
        <span className="inc-section-tag" style={{ background: sectionColor }}>
          {sectionLabel(section)}
        </span>
        <span className="inc-section-title">{loc(week.title, lang) as string}</span>
      </div>

      {/* Day Button Bar */}
      <div className="disc-day-bar">
        {week.days.map((day, i) => (
          <button
            key={i}
            className={`disc-day-btn ${dayIdx === i ? 'active' : ''}`}
            style={dayIdx === i ? { borderColor: sectionColor, color: sectionColor } : {}}
            onClick={() => handleDayChange(i)}
          >
            {t('inc.day')} {day.day}
          </button>
        ))}
      </div>

      {/* Modules for the selected day */}
      {currentDay.modules.map((mod, mi) => (
        <div key={mi} className="inc-module-card">
          <div className="inc-module-header">
            <div>
              {currentDay.modules.length > 1 && (
                <span className="inc-module-num" style={{ color: sectionColor }}>
                  {t('inc.module')} {mi + 1}
                </span>
              )}
              <h3 className="inc-module-title">{loc(mod.title, lang) as string}</h3>
            </div>
            <button
              className="disc-passage-ref"
              style={{ borderColor: sectionColor, color: sectionColor }}
              onClick={() => setVerseModal({ reference: loc(mod.scripture, lang) as string })}
            >
              {loc(mod.scripture, lang) as string} ↗
            </button>
          </div>

          {(() => {
            // Per module: weeks 4-5 have several modules a day, each with its own text.
            const bodyEntry = loadState === 'ready' ? modules?.[mi]?.body : null;
            if (!bodyEntry) return null;
            const bodyText = lang === 'es' ? bodyEntry.es : bodyEntry.en;
            return (
              <div className="inc-module-body">
                {bodyText.split('\n').map((line, li) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={li} style={{ height: 8 }} />;
                  if (/^[0-9]+\.\s/.test(trimmed) || /^[A-ZÁÉÍÓÚÑ]{3,}/.test(trimmed)) {
                    return <h4 key={li} className="inc-body-heading">{trimmed}</h4>;
                  }
                  if (trimmed.startsWith('●') || trimmed.startsWith('•')) {
                    return <p key={li} className="inc-body-bullet">{trimmed}</p>;
                  }
                  return <p key={li} className="inc-body-p">{trimmed}</p>;
                })}
              </div>
            );
          })()}

          {/* Key Verses */}
          <div style={{ marginTop: 16 }}>
            <h4 className="inc-label">{mod.keyVerses.length === 1 ? t('inc.keyVerse') : t('inc.keyVerses')}</h4>
            <div className="disc-memory">
              {mod.keyVerses.map((v, vi) => (
                <button
                  key={vi}
                  className="disc-memory-chip"
                  style={{ borderColor: sectionColor, color: sectionColor }}
                  onClick={() => setVerseModal({ reference: loc(v, lang) as string })}
                >
                  {loc(v, lang) as string} ↗
                </button>
              ))}
            </div>
          </div>

          {/* Self-Evaluation */}
          <div style={{ marginTop: 20 }}>
            <h4 className="inc-label">{t('inc.selfEval')}</h4>
            {mod.selfEval.map((q, qi) => (
              <div key={qi} className="inc-eval-item">
                <p className="inc-eval-question">
                  {qi + 1}. {loc(q, lang) as string}
                </p>
                <textarea
                  className="disc-answer"
                  placeholder={t('inc.yourAnswer')}
                  value={getAnswer(mi, qi)}
                  onChange={(e) => setAnswer(mi, qi, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Scripture Verse Modal */}
      {verseModal && (
        <ScriptureModal
          reference={verseModal.reference}
          lang={lang}
          onClose={() => setVerseModal(null)}
        />
      )}
    </div>
  );
}
