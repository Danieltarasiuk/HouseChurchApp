'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const week = DISCIPLESHIP_CURRICULUM.weeks[weekIdx];
  const currentDay = week.days[dayIdx];
  const section = currentDay.section; // auto-determined from day

  // Load answers from DB when week/day changes
  useEffect(() => {
    fetch(`/api/discipleship/answers?week=${weekIdx + 1}&day=${dayIdx + 1}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.answers && typeof data.answers === 'object') {
          const prefixed: AnswersState = {};
          for (const [key, val] of Object.entries(data.answers)) {
            prefixed[`${weekIdx}-${dayIdx}-${key}`] = val as string;
          }
          setAnswers((prev) => ({ ...prev, ...prefixed }));
        }
      })
      .catch(() => {});
  }, [weekIdx, dayIdx]);

  // Debounced save function
  const saveAnswers = useCallback((currentAnswers: AnswersState, wIdx: number, dIdx: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      const prefix = `${wIdx}-${dIdx}-`;
      const stripped: Record<string, string> = {};
      for (const [key, val] of Object.entries(currentAnswers)) {
        if (key.startsWith(prefix) && val) {
          stripped[key.slice(prefix.length)] = val;
        }
      }

      if (Object.keys(stripped).length === 0) return;

      setSavingState('saving');
      fetch('/api/discipleship/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: wIdx + 1, day: dIdx + 1, answers: stripped }),
      })
        .then((res) => {
          if (res.ok) {
            setSavingState('saved');
            if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
            savedTimerRef.current = setTimeout(() => setSavingState('idle'), 2000);
          } else {
            setSavingState('idle');
          }
        })
        .catch(() => setSavingState('idle'));
    }, 500);
  }, []);

  const handleWeekChange = (idx: number) => {
    setWeekIdx(idx);
    setDayIdx(0);
  };

  const answerKey = (pi: number | string, type: string): string =>
    `${weekIdx}-${dayIdx}-${pi}-${type}`;
  const getAnswer = (pi: number | string, type: string): string =>
    answers[answerKey(pi, type)] || '';
  const setAnswer = (pi: number | string, type: string, val: string) => {
    const newAnswers = { ...answers, [answerKey(pi, type)]: val };
    setAnswers(newAnswers);
    saveAnswers(newAnswers, weekIdx, dayIdx);
  };

  return (
    <div>
      <div className="page-header">
        <h2>{t('disc.title')}</h2>
        <p>{t('disc.sub')}</p>
      </div>

      {/* Save Status */}
      {savingState !== 'idle' && (
        <div style={{ fontSize: '13px', color: savingState === 'saving' ? 'var(--text-tertiary)' : 'var(--accent)', marginBottom: '12px' }}>
          {savingState === 'saving' ? t('pastoral.saving') : t('pastoral.saved')}
        </div>
      )}

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
