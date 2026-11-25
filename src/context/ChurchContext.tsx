'use client';

import React, { createContext, useContext } from 'react';
import type { GroupLabels } from '@/lib/groupLabel';

/**
 * The current church's public settings for the browser (name, timezone,
 * labels, giving link), plus the churches this user can switch to. The root
 * layout resolves them on the server (src/lib/currentChurch.ts) and passes
 * them in, so the first paint already shows the right church.
 */
export interface PublicChurch {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  defaultLanguage: 'en' | 'es';
  groupLabels: GroupLabels;
  /** Church Center giving page, or null when giving is not set up. */
  givingUrl: string | null;
  /** Events are pushed to a Google Calendar (churches.google_calendar_id is set). */
  hasGoogleCalendar: boolean;
}

export interface ChurchOption {
  id: string;
  name: string;
}

interface ChurchContextType {
  church: PublicChurch | null;
  /** Churches the switcher offers (memberships; every church for a platform admin). */
  options: ChurchOption[];
  /** Show the switcher: more than one church, or a platform admin. */
  canSwitch: boolean;
}

const ChurchContext = createContext<ChurchContextType>({ church: null, options: [], canSwitch: false });

export function ChurchProvider({
  church,
  options,
  canSwitch,
  children,
}: ChurchContextType & { children: React.ReactNode }) {
  return <ChurchContext.Provider value={{ church, options, canSwitch }}>{children}</ChurchContext.Provider>;
}

export function useChurch(): ChurchContextType {
  return useContext(ChurchContext);
}
