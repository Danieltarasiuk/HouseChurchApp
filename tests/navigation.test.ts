import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { navSections, type NavRole } from '@/lib/navigation';
import { isProtectedPath } from '@/lib/protected-paths';
import { translations } from '@/lib/translations';

/**
 * The sidebar decides only what is shown; each page and API route checks the
 * role itself. These tests pin down that the sections changed no one's links
 * except as intended: Give left the sidebar (it stays on the dashboard), and
 * members gained Events.
 */

const t = (key: string) => key;
const hrefs = (role: NavRole, incubator: boolean) =>
  navSections(t, role, incubator).flatMap((s) => s.items.map((i) => i.href));
/** My profile is in the account menu for everyone; Settings for admins. */
const accountMenu = (role: NavRole) => ['/profile', ...(role === 'admin' ? ['/settings'] : [])];
const reachable = (role: NavRole, incubator: boolean) => new Set([...hrefs(role, incubator), ...accountMenu(role)]);

/** Each role's sidebar links before the sections (Sidebar.tsx at 3d8a6ee), minus Give. */
const BEFORE: Record<NavRole, string[]> = {
  member: ['/dashboard', '/discipleship', '/groups', '/members', '/prayer', '/profile'],
  group_leader: ['/dashboard', '/discipleship', '/groups', '/members', '/pastoral', '/calendar', '/attendance', '/prayer', '/profile'],
  admin: ['/dashboard', '/discipleship', '/incubator', '/groups', '/members', '/pastoral', '/calendar', '/attendance', '/prayer', '/profile', '/settings'],
};

describe('sidebar links by role', () => {
  it('members: what they had, plus Events', () => {
    expect(reachable('member', false)).toEqual(new Set([...BEFORE.member, '/events']));
    expect(reachable('member', true)).toEqual(new Set([...BEFORE.member, '/events', '/incubator']));
  });

  it('group leaders: exactly what they had (Calendar shows both kinds)', () => {
    expect(reachable('group_leader', false)).toEqual(new Set(BEFORE.group_leader));
    expect(reachable('group_leader', true)).toEqual(new Set([...BEFORE.group_leader, '/incubator']));
  });

  it('admins: exactly what they had', () => {
    expect(reachable('admin', true)).toEqual(new Set(BEFORE.admin));
  });

  it('sections in order, with Care only for admins and group leaders', () => {
    const keys = (role: NavRole) => navSections(t, role, false).map((s) => s.key);
    expect(keys('member')).toEqual(['home', 'community', 'grow']);
    expect(keys('group_leader')).toEqual(['home', 'community', 'grow', 'care']);
    expect(keys('admin')).toEqual(['home', 'community', 'grow', 'care']);
  });

  it('Members sits under Community for members and under Care for leaders, once each', () => {
    const where = (role: NavRole) =>
      navSections(t, role, false).filter((s) => s.items.some((i) => i.href === '/members')).map((s) => s.key);
    expect(where('member')).toEqual(['community']);
    expect(where('group_leader')).toEqual(['care']);
    expect(where('admin')).toEqual(['care']);
  });

  it('members get Events, leaders and admins get Calendar', () => {
    expect(hrefs('member', false)).toContain('/events');
    expect(hrefs('member', false)).not.toContain('/calendar');
    for (const role of ['admin', 'group_leader'] as const) {
      expect(hrefs(role, false)).toContain('/calendar');
      expect(hrefs(role, false)).not.toContain('/events');
    }
  });

  it('no Give link', () => {
    for (const role of ['admin', 'group_leader', 'member'] as const) expect(hrefs(role, true).join()).not.toMatch(/giv/i);
  });
});

describe('every app page needs a signed-in user', () => {
  it('each page under (dashboard) is in PROTECTED_PATHS', () => {
    const dir = path.join(__dirname, '..', 'src', 'app', '(dashboard)');
    const pages = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `/${d.name}`);
    expect(pages).toContain('/events');
    for (const page of pages) expect(isProtectedPath(page), page).toBe(true);
  });
});

describe('translations', () => {
  it('English and Spanish have the same keys, none empty', () => {
    const en = Object.keys(translations.en).sort();
    const es = Object.keys(translations.es).sort();
    expect(es).toEqual(en);
    for (const lang of ['en', 'es'] as const) {
      for (const key of en) expect(translations[lang][key].trim(), `${lang} ${key}`).not.toBe('');
    }
  });
});
