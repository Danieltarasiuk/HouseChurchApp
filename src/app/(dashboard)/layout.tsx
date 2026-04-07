import { LangProvider } from '@/context/LangContext';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LangProvider>
      <Sidebar />
      <main className="main-content">{children}</main>
    </LangProvider>
  );
}
