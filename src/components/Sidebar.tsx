'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Home,
  BookOpen,
  Sprout,
  Calendar,
  Heart,
  LogOut,
} from 'lucide-react';
import { useLang } from '@/context/LangContext';

export function Sidebar() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLang();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  };

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

  return (
    <aside className="sidebar">
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
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">D</div>
          <div className="user-details">
            <strong>Danny</strong>
            <span>Senior Pastor</span>
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

        <button className="logout-btn" data-testid="logout-btn">
          <LogOut size={14} style={{ marginRight: '8px' }} />
          {t('auth.logout')}
        </button>
      </div>
    </aside>
  );
}
