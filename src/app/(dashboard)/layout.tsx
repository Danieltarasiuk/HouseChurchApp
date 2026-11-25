'use client';

import { SessionProvider } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Sidebar />
      <main className="main-content">{children}</main>
    </SessionProvider>
  );
}
