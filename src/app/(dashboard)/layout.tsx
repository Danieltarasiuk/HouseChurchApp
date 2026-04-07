'use client';

import { SessionProvider } from 'next-auth/react';
import { LangProvider } from '@/context/LangContext';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <LangProvider>
        <Sidebar />
        <main className="main-content">{children}</main>
      </LangProvider>
    </SessionProvider>
  );
}
