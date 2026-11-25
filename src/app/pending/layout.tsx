'use client';

import { SessionProvider } from 'next-auth/react';
import { LangProvider } from '@/context/LangContext';

/** Outside the (dashboard) group on purpose: no sidebar, no links into the app. */
export default function PendingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LangProvider>{children}</LangProvider>
    </SessionProvider>
  );
}
