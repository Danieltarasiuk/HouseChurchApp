'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Settings, UserCircle, LogOut, Menu, X, ChevronUp } from 'lucide-react';
import { useLang } from '@/context/LangContext';
import { useChurch } from '@/context/ChurchContext';
import { ChurchSwitcher } from '@/components/ChurchSwitcher';
import { navSections, type NavRole as Role } from '@/lib/navigation';

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sessionRole = (session?.user as { role?: string })?.role;
  const role: Role = sessionRole === 'admin' || sessionRole === 'group_leader' ? sessionRole : 'member';

  // Pastor Incubator: admins always; others need a grant (asked once).
  const [incubatorGranted, setIncubatorGranted] = React.useState(false);
  const userId = session?.user?.id;
  React.useEffect(() => {
    if (!userId || role === 'admin') return;
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => setIncubatorGranted(!!me?.incubatorAccess))
      .catch(() => {});
  }, [userId, role]);
  const canOpenIncubator = role === 'admin' || incubatorGranted;

  // The phone menu closes on every navigation, and on Escape.
  React.useEffect(() => setMobileOpen(false), [pathname]);
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');
  const sections = navSections(t, role, canOpenIncubator);

  return (
    <>
      {/* Phone top bar (under 768px) */}
      <div className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label={t('nav.openMenu')}
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          data-testid="mobile-menu-btn"
        >
          <Menu size={24} />
        </button>
        <span className="mobile-header-title">{t('app.title')}</span>
      </div>

      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside id="app-sidebar" className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <button className="mobile-close-btn" onClick={() => setMobileOpen(false)} aria-label={t('nav.closeMenu')}>
          <X size={20} />
        </button>

        <div className="sidebar-header">
          <h1>{t('app.title')}</h1>
          <span>{t('app.subtitle')}</span>
        </div>

        {/* Scrolls on its own, so the account menu below is always in view. */}
        <nav className="sidebar-nav" aria-label={t('nav.mainMenu')}>
          {sections.map((section) => (
            <div key={section.key} className="nav-section" data-testid={`nav-section-${section.key}`}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    data-testid={item.testId}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <AccountMenu role={role} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </div>
      </aside>
    </>
  );
}

/**
 * The user's name at the bottom of the sidebar; clicking it opens a menu
 * above it with the church switcher, My profile, Settings (admins), the
 * language and Sign out.
 */
function AccountMenu({ role, pathname, onNavigate }: { role: Role; pathname: string; onNavigate: () => void }) {
  const { language, setLanguage, t } = useLang();
  const { data: session } = useSession();
  const { church, canSwitch } = useChurch();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const userName = session?.user?.name || t('sidebar.user');
  const subtitle = [t('role.' + role), canSwitch && church ? church.name : null].filter(Boolean).join(' · ');
  const go = () => {
    setOpen(false);
    onNavigate();
  };

  return (
    <div className="account" ref={rootRef}>
      {open && (
        <div className="account-menu" id="account-menu" role="menu" aria-label={t('nav.account')} data-testid="account-menu">
          {canSwitch && (
            <div className="account-menu-switcher">
              <ChurchSwitcher />
            </div>
          )}
          <Link href="/profile" role="menuitem" className="account-menu-item" data-testid="nav-profile" onClick={go}>
            <UserCircle size={18} />
            {t('nav.profile')}
          </Link>
          {role === 'admin' && (
            <Link href="/settings" role="menuitem" className="account-menu-item" data-testid="nav-settings" onClick={go}>
              <Settings size={18} />
              {t('nav.settings')}
            </Link>
          )}
          <div className="account-menu-lang" role="group" aria-label={t('nav.language')}>
            <span>{t('nav.language')}</span>
            <div className="lang-toggle">
              {(['en', 'es'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`lang-btn ${language === l ? 'active' : ''}`}
                  aria-pressed={language === l}
                  onClick={() => setLanguage(l)}
                  data-testid={`lang-${l}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            className="account-menu-item account-menu-signout"
            data-testid="logout-btn"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut size={18} />
            {t('nav.signOut')}
          </button>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((o) => !o)}
        data-testid="account-trigger"
      >
        <span className="user-avatar">{userName.charAt(0).toUpperCase()}</span>
        <span className="user-details">
          <strong>{userName}</strong>
          {subtitle && <span>{subtitle}</span>}
        </span>
        <ChevronUp size={16} className={`account-chevron${open ? ' open' : ''}`} aria-hidden />
      </button>
    </div>
  );
}
