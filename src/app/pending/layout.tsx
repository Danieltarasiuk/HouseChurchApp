'use client';

import { SessionProvider } from 'next-auth/react';

/** Outside the (dashboard) group on purpose: no sidebar, no links into the app. */
export default function PendingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
