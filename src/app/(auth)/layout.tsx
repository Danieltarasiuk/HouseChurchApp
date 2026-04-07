import { LangProvider } from '@/context/LangContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LangProvider>{children}</LangProvider>;
}
