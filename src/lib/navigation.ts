/**
 * The sidebar's links, by section and role. Plain data (no React state), so
 * tests can check who sees what.
 */
import {
  LayoutDashboard,
  Users,
  Home,
  BookOpen,
  Sprout,
  Calendar,
  CalendarDays,
  HeartHandshake,
  Heart,
} from 'lucide-react';

export type NavRole = 'admin' | 'group_leader' | 'member';

export interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  testId: string;
  /** Roles that see the link. Omitted: everyone. */
  roles?: NavRole[];
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

const LEADERS: NavRole[] = ['admin', 'group_leader'];

/**
 * Who sees which link. These only decide what the sidebar shows; every page
 * and API route checks the role itself, so a hidden link is not a permission.
 * Visibility per page is unchanged from before the sections: Members is for
 * everyone (the directory, under Community for members and Care for leaders),
 * Pastoral Care, Attendance and Calendar are for admins and group leaders,
 * Settings for admins, and the Incubator for admins or a granted user.
 */
export function navSections(t: (key: string) => string, role: NavRole, canOpenIncubator: boolean): NavSection[] {
  const sections: NavSection[] = [
    {
      key: 'home',
      label: t('nav.section.home'),
      items: [{ href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), testId: 'nav-dashboard' }],
    },
    {
      key: 'community',
      label: t('nav.section.community'),
      items: [
        { href: '/groups', icon: Home, label: t('nav.groups'), testId: 'nav-groups' },
        { href: '/members', icon: Users, label: t('nav.members'), testId: 'nav-members', roles: ['member'] },
        { href: '/prayer', icon: Heart, label: t('nav.prayer'), testId: 'nav-prayer' },
        { href: '/events', icon: CalendarDays, label: t('nav.events'), testId: 'nav-events', roles: ['member'] },
        { href: '/calendar', icon: CalendarDays, label: t('nav.calendar'), testId: 'nav-calendar', roles: LEADERS },
      ],
    },
    {
      key: 'grow',
      label: t('nav.section.grow'),
      items: [
        { href: '/discipleship', icon: BookOpen, label: t('nav.discipleship'), testId: 'nav-discipleship' },
        ...(canOpenIncubator
          ? [{ href: '/incubator', icon: Sprout, label: t('nav.incubator'), testId: 'nav-incubator' }]
          : []),
      ],
    },
    {
      key: 'care',
      label: t('nav.section.care'),
      items: [
        { href: '/members', icon: Users, label: t('nav.members'), testId: 'nav-members', roles: LEADERS },
        { href: '/pastoral', icon: HeartHandshake, label: t('nav.pastoral'), testId: 'nav-pastoral', roles: LEADERS },
        { href: '/attendance', icon: Calendar, label: t('nav.attendance'), testId: 'nav-attendance', roles: LEADERS },
      ],
    },
  ];
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || i.roles.includes(role)) }))
    .filter((s) => s.items.length > 0);
}
