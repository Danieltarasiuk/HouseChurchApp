import type { Metadata } from 'next';
import './globals.css';
import { CHURCH_CENTER_MODAL_SRC, GIVING_URL } from '@/lib/giving';

export const metadata: Metadata = {
  title: 'HouseChurchApp',
  description: 'A bilingual (EN/ES) web app for managing a network of house churches — discipleship tracking, pastor training, attendance, prayer requests, and member management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/*
          Church Center's giving modal. Deliberately a plain blocking <script>
          in <head> rather than next/script: the modal attaches its overlay
          on DOMContentLoaded, so a script that loads after that event (as
          next/script's afterInteractive/lazyOnload do) never shows the
          overlay. The file is ~5 KB.
        */}
        {GIVING_URL && <script src={CHURCH_CENTER_MODAL_SRC} />}
      </head>
      <body>
        <div className="app">
          {children}
        </div>
      </body>
    </html>
  );
}
