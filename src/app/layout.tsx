import type { Metadata } from 'next';
import './globals.css';

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
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div className="app">
          {children}
        </div>
      </body>
    </html>
  );
}
