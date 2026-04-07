'use client';

import React, { useState } from 'react';
import { useLang } from '@/context/LangContext';
import ScriptureModal from '@/components/ScriptureModal';
import { DISCIPLESHIP_CURRICULUM, loc } from '@/data/discipleship-curriculum';

interface VerseModalState {
  reference: string;
}

interface AnswersState {
  [key: string]: string;
}

export default function DiscipleshipPage() {
  const { language: lang, t } = useLang();
  const [weekIdx, setWeekIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0); // 0-5 for days 1-6
  const [answers, setAnswers] = useState<AnswersState>({}); // keyed by "week-day-passage-type"
  const [verseModal, setVerseModal] = useState<VerseModalState | null>(null); // { reference }

  const week = DISCIPLESHIP_CURRICULUM.weeks[weekIdx];
  const currentDay = week.days[dayIdx];
  const section = currentDay.section; // auto-determined from day

  const handleWeekChange = (idx: number) => {
    setWeekIdx(idx);
    setDayIdx(0);
  };

  const answerKey = (pi: number, type: string): string =>
    `${weekIdx}-${dayIdx}-${pi}-${type}`;
  const getAnswer = (pi: number, type: string): string =>
    answers[answerKey(pi, type)] || '';
  const setAnswer = (pi: number, type: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [answerKey(pi, type)]: val }));
  };

  return (
    <div>
      <div className="page-header">
        <h2>{t('disc.title')}</h2>
        <p>{t('disc.sub')}</p>
      </div>

      {/* Week Tabs */}
      <div className="disc-week-tabs">
        {DISCIPLESHIP_CURRICULUM.weeks.map((w, i) => (
          <button
            key={i}
            className={`disc-week-tab ${weekIdx === i ? 'active' : ''}`}
            onClick={() => handleWeekChange(i)}
          >
            {t('disc.week')} {w.number}
          </button>
        ))}
      </div>

      {/* Central Concept */}
      <div className="disc-concept">
        <h4>{t('disc.centralConcept')}</h4>
        <p>{loc(week.centralConcept, lang)}</p>
        <div style={{ marginTop: 14 }}>
          <h4 style={{ marginTop: 8 }}>{t('disc.memoryVerses')}</h4>
          <div className="disc-memory">
            {(loc(week.memoryVerses, lang) as string[]).map((v, i) => (
              <button
                key={i}
                className="disc-memory-chip"
                onClick={() => setVerseModal({ reference: v })}
              >
                {v} ↗
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Day 1-6 Button Bar */}
      <div className="disc-day-bar">
        {week.days.map((day, i) => (
          <button
            key={i}
            className={`disc-day-btn ${dayIdx === i ? 'active' : ''} ${
              day.section === 'know' ? 'know-day' : 'grow-day'
            }`}
            onClick={() => setDayIdx(i)}
          >
            {t('disc.day')} {day.day}
            <span className="disc-day-section-dot">
              {day.section === 'know' ? t('disc.know') : t('disc.grow')}
            </span>
          </button>
        ))}
      </div>

      {/* Section Label */}
      <div className={`disc-section-label ${section}`}>
        {section === 'know' ? t('disc.know') : t('disc.grow')} —{' '}
        {section === 'know' ? loc(week.know, lang) : loc(week.grow, lang)}
      </div>

      {/* Passages for the selected day */}
      {currentDay.passages.map((passage, pi) => (
        <div key={pi} className={`disc-passage ${section}`}>
          <div className="disc-passage-header">
            <span className="disc-passage-title">
              {loc(passage.title, lang)}
            </span>
            <button
              className={`disc-passage-ref ${section}`}
              onClick={() =>
                setVerseModal({
                  reference: loc(passage.scripture, lang) as string,
                })
              }
            >
              {loc(passage.scripture, lang)} ↗
            </button>
          </div>
          <div className="disc-qa">
            <div className="disc-qa-label reflect">{t('disc.reflect')}</div>
            <p className="disc-qa-text">
              {loc(passage.reflect, lang)}
            </p>
            <textarea
              className="disc-answer"
              placeholder={t('disc.yourAnswer')}
              value={getAnswer(pi, 'reflect')}
              onChange={(e) => setAnswer(pi, 'reflect', e.target.value)}
            />

            <div className="disc-qa-label apply">{t('disc.apply')}</div>
            <p className="disc-qa-text">{loc(passage.apply, lang)}</p>
            <textarea
              className="disc-answer"
              placeholder={t('disc.yourAnswer')}
              value={getAnswer(pi, 'apply')}
              onChange={(e) => setAnswer(pi, 'apply', e.target.value)}
            />
          </div>
        </div>
      ))}

      {/* Action Step */}
      <div className="disc-action">
        <h4>{t('disc.actionStep')}</h4>
        <p>
          {section === 'know'
            ? loc(week.actionStep, lang)
            : loc(week.growActionStep, lang)}
        </p>
        <textarea
          className="disc-answer"
          style={{ marginTop: 14, background: 'rgba(255,255,255,0.7)' }}
          placeholder={t('disc.yourAnswer')}
          value={getAnswer('action', section)}
          onChange={(e) => setAnswer('action', section, e.target.value)}
        />
      </div>

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
