import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import './globals.css';
import { CHURCH_CENTER_MODAL_SRC, givingUrlFor } from '@/lib/giving';
import { LangProvider } from '@/context/LangContext';
import { ChurchProvider, type ChurchOption, type PublicChurch } from '@/context/ChurchContext';
import { LANG_COOKIE, isLanguage, translate, type Language } from '@/lib/translations';
import { groupLabelsOf } from '@/lib/groupLabel';
import { auth } from '@/lib/auth';
import { resolveChurchForUser, resolveSignupChurch } from '@/lib/currentChurch';
import { systemGetChurch, systemListChurches, systemListMemberships } from '@/lib/system';

/**
 * The church this page is for (signed in: the current church; signed out:
 * the one being signed in or up to) and the churches the switcher offers.
 * System queries only: nothing church-owned is read here.
 */
async function requestChurch(): Promise<{ church: PublicChurch | null; options: ChurchOption[]; canSwitch: boolean }> {
  // Per request (cookies, session): never prerendered.
  await cookies();
  try {
    const session = await auth();
    const userId = session?.user?.id;
    let churchId: string | null;
    let options: ChurchOption[] = [];
    let canSwitch = false;
    if (userId) {
      const resolved = await resolveChurchForUser(userId);
      churchId = resolved?.churchId ?? null;
      if (resolved?.isPlatformAdmin) {
        options = (await systemListChurches()).map((c) => ({ id: c.id, name: c.name }));
        canSwitch = true;
      } else {
        options = (await systemListMemberships(userId)).map((m) => ({ id: m.churchId, name: m.name }));
        canSwitch = options.length > 1;
      }
    } else {
      churchId = await resolveSignupChurch();
    }
    const row = churchId ? await systemGetChurch(churchId) : null;
    const church: PublicChurch | null = row && {
      id: row.id,
      slug: row.slug,
      name: row.name,
      timezone: row.timezone,
      defaultLanguage: row.default_language,
      groupLabels: groupLabelsOf(row),
      givingUrl: givingUrlFor(row.church_center_url),
      hasGoogleCalendar: !!row.google_calendar_id,
    };
    return { church, options, canSwitch };
  } catch (error) {
    unstable_rethrow(error); // Next's own control flow (dynamic rendering, redirects)
    console.error('Could not resolve the church for this page:', error);
    return { church: null, options: [], canSwitch: false };
  }
}

/** The visitor's chosen language, from the cookie LangProvider sets; else the church's default. */
async function requestLanguage(church: PublicChurch | null): Promise<Language> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLanguage(value) ? value : church?.defaultLanguage ?? 'en';
}

export async function generateMetadata(): Promise<Metadata> {
  const { church } = await requestChurch();
  const lang = await requestLanguage(church);
  return {
    title: translate(lang, 'app.title', church?.groupLabels),
    description: translate(lang, 'app.description', church?.groupLabels),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { church, options, canSwitch } = await requestChurch();
  const lang = await requestLanguage(church);
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
        {church?.givingUrl && <script src={CHURCH_CENTER_MODAL_SRC} />}
      </head>
      <body>
        <div className="app">
          {/* One provider for the whole app, starting in the cookie's
              language so the first paint is already translated, with the
              current church's settings and group label. */}
          <ChurchProvider church={church} options={options} canSwitch={canSwitch}>
            <LangProvider initialLanguage={lang} groupLabels={church?.groupLabels}>{children}</LangProvider>
          </ChurchProvider>
        </div>
      </body>
    </html>
  );
}
