'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { translate, LANG_COOKIE, isLanguage, type Language } from '@/lib/translations';

interface LangContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

/** Persist the choice where the server can read it (cookie) and, as before, in localStorage. */
function persistLanguage(lang: Language) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  try { localStorage.setItem(LANG_COOKIE, lang); } catch { /* storage unavailable */ }
  document.documentElement.lang = lang;
}

/**
 * Provides the active language. The root layout reads the language cookie
 * and passes it as initialLanguage, so the server renders the right language
 * and <html lang> from the first paint (no English flash for Spanish users).
 */
export function LangProvider({ children, initialLanguage = 'en' }: { children: React.ReactNode; initialLanguage?: Language }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  }, []);

  // One-time migration: a choice saved only in localStorage (before the
  // cookie existed) is copied to the cookie, and the page reloads once so
  // the server renders it. No state is set here.
  useEffect(() => {
    const hasCookie = document.cookie.split('; ').some((c) => c.startsWith(`${LANG_COOKIE}=`));
    if (hasCookie) return;
    let saved: string | null = null;
    try { saved = localStorage.getItem(LANG_COOKIE); } catch { /* storage unavailable */ }
    persistLanguage(isLanguage(saved) ? saved : initialLanguage);
    if (isLanguage(saved) && saved !== initialLanguage) window.location.reload();
  }, [initialLanguage]);

  const t = useCallback((key: string): string => {
    return translate(language, key);
  }, [language]);

  return (
    <LangContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error('useLang must be used within LangProvider');
  }
  return context;
}
