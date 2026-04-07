'use client';

import React, { useState } from 'react';
import { useLang } from '@/context/LangContext';
import ScriptureModal from '@/components/ScriptureModal';
import { INCUBATOR_CURRICULUM, loc } from '@/data/incubator-curriculum';
import { INCUBATOR_BODIES } from '@/data/incubator-bodies';

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

  const week = INCUBATOR_CURRICULUM.weeks[weekIdx];
  const currentDay = week.days[dayIdx];
  const section = week.section;
  const sectionColor = SECTION_COLORS[section];

  const handleWeekChange = (idx: number) => {
    setWeekIdx(idx);
    setDayIdx(0);
  };

  const answerKey = (mi: number, qi: number): string =>
    `${weekIdx}-${dayIdx}-${mi}-${qi}`;
  const getAnswer = (mi: number, qi: number): string =>
    answers[answerKey(mi, qi)] || '';
  const setAnswer = (mi: number, qi: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [answerKey(mi, qi)]: val }));
  };

  const WEEK_OFFSETS = [0, 4, 8, 13, 22];
  const getBodyIndex = (wIdx: number, dIdx: number) =>
    WEEK_OFFSETS[wIdx] + dIdx;

  const sectionLabel = (s: string) => {
    switch (s) {
      case 'character': return t('inc.character');
      case 'doctrine': return t('inc.doctrine');
      case 'convictions': return t('inc.convictions');
      default: return s;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>{t('inc.title')}</h2>
        <p>{t('inc.sub')}</p>
      </div>

      {/* Week Tabs */}
      <div className="disc-week-tabs">
        {INCUBATOR_CURRICULUM.weeks.map((w, i) => (
          <button
            key={i}
            className={`disc-week-tab ${weekIdx === i ? 'active' : ''}`}
            style={weekIdx === i ? { borderColor: SECTION_COLORS[w.section], color: SECTION_COLORS[w.section] } : {}}
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
            onClick={() => setDayIdx(i)}
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
            const bodyEntry = INCUBATOR_BODIES[getBodyIndex(weekIdx, dayIdx)];
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
