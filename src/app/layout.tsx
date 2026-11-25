import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { CHURCH_CENTER_MODAL_SRC, GIVING_URL } from '@/lib/giving';
import { LangProvider } from '@/context/LangContext';
import { LANG_COOKIE, isLanguage, translate, type Language } from '@/lib/translations';

/** The visitor's chosen language, from the cookie LangProvider sets. */
async function requestLanguage(): Promise<Language> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLanguage(value) ? value : 'en';
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await requestLanguage();
  return { title: translate(lang, 'app.title'), description: translate(lang, 'app.description') };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await requestLanguage();
  return (
    <html lang={lang}>
      <head>
        {/*
          Church Center's giving modal. Deliberately a plain blocking <script>
          in <head> rather than next/script: the modal attaches its overlay
          on DOMContentLoaded, so a script that loads after that event (as
          next/script's afterInteractive/lazyOnload do) never shows the
          overlay. The file is ~5 KB.
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- must load before DOMContentLoaded, see above */}
        {GIVING_URL && <script src={CHURCH_CENTER_MODAL_SRC} />}
      </head>
      <body>
        <div className="app">
          {/* One provider for the whole app, starting in the cookie's
              language so the first paint is already translated. */}
          <LangProvider initialLanguage={lang}>{children}</LangProvider>
        </div>
      </body>
    </html>
  );
}
