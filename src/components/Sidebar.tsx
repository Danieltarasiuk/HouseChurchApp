'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  Home,
  BookOpen,
  Sprout,
  Calendar,
  Heart,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useLang } from '@/context/LangContext';

export function Sidebar() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLang();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

  const userName = session?.user?.name || t('sidebar.user');
  const userInitial = userName.charAt(0).toUpperCase();
  const userRole = (session?.user as { role?: string })?.role
    ? t('role.' + (session?.user as { role?: string }).role)
    : '';

  const navItems = [
    {
      href: '/dashboard',
      icon: LayoutDashboard,
      label: t('nav.dashboard'),
      testId: 'nav-dashboard',
    },
    {
      href: '/discipleship',
      icon: BookOpen,
      label: t('nav.discipleship'),
      testId: 'nav-discipleship',
    },
    {
      href: '/incubator',
      icon: Sprout,
      label: t('nav.incubator'),
      testId: 'nav-incubator',
    },
    {
      href: '/house-churches',
      icon: Home,
      label: t('nav.churches'),
      testId: 'nav-churches',
    },
    {
      href: '/members',
      icon: Users,
      label: t('nav.members'),
      testId: 'nav-members',
    },
    {
      href: '/attendance',
      icon: Calendar,
      label: t('nav.attendance'),
      testId: 'nav-attendance',
    },
    {
      href: '/prayer',
      icon: Heart,
      label: t('nav.prayer'),
      testId: 'nav-prayer',
    },
  ];

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      {/* Mobile header */}
      <div className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <span className="mobile-header-title">{t('app.title')}</span>
        <div className="lang-toggle-mobile">
          <button
            className={`lang-btn-mobile ${language === 'en' ? 'active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
          <button
            className={`lang-btn-mobile ${language === 'es' ? 'active' : ''}`}
            onClick={() => setLanguage('es')}
          >
            ES
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        {/* Mobile close button */}
        <button
          className="mobile-close-btn"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

        <div className="sidebar-header">
          <h1>{t('app.title')}</h1>
          <span>{t('app.subtitle')}</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                data-testid={item.testId}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{userInitial}</div>
            <div className="user-details">
              <strong>{userName}</strong>
              {userRole && <span>{userRole}</span>}
            </div>
          </div>

          <div className="lang-toggle">
            <button
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
              data-testid="lang-en"
            >
              EN
            </button>
            <button
              className={`lang-btn ${language === 'es' ? 'active' : ''}`}
              onClick={() => setLanguage('es')}
              data-testid="lang-es"
            >
              ES
            </button>
          </div>

          <button
            className="logout-btn"
            data-testid="logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={14} style={{ marginRight: '8px' }} />
            {t('auth.logout')}
          </button>
        </div>
      </aside>
    </>
  );
}
