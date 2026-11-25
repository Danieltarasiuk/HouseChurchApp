import { describe, it, expect } from 'vitest';
import { translations, translate } from '@/lib/translations';
import { GROUP_LABEL, withGroupLabel } from '@/lib/groupLabel';
import { CALENDAR_CATEGORIES } from '@/lib/calendarCategories';
import { PASTORAL_TOPICS } from '@/data/pastoral-topics';

describe('group label', () => {
  it('CityChurch still sees "House Church" / "Iglesia en Casa"', () => {
    expect(GROUP_LABEL).toEqual({
      en: { one: 'House Church', other: 'House Churches' },
      es: { one: 'Iglesia en Casa', other: 'Iglesias en Casa' },
    });
    expect(translate('en', 'nav.groups')).toBe('House Churches');
    expect(translate('es', 'nav.groups')).toBe('Iglesias en Casa');
    expect(translate('en', 'role.group_leader')).toBe('House Church Pastor');
    expect(translate('es', 'role.group_leader')).toBe('Pastor de Iglesia en Casa');
    expect(translate('en', 'group.noMembers')).toBe('No members in this house church');
    expect(translate('es', 'group.created')).toBe('Iglesia en casa creada exitosamente.');
    expect(translate('en', 'privacy.churchDesc')).toMatch(/^Church-wide default .* House churches, pastors/);
  });

  it('fills every token in both languages', () => {
    for (const lang of ['en', 'es'] as const) {
      for (const key of Object.keys(translations[lang])) {
        expect(translate(lang, key), `${lang} ${key}`).not.toMatch(/\{Groups?(:sentence)?\}|\{groups?\}/);
      }
    }
  });

  it('leaves other placeholders for the caller', () => {
    expect(withGroupLabel('{count} {groups} deactivated', 'en')).toBe('{count} house churches deactivated');
  });

  it('calendar category and pastoral topic use the same label', () => {
    expect(CALENDAR_CATEGORIES.group).toMatchObject({ en: 'House Church', es: 'Iglesia en Casa' });
    const topic = PASTORAL_TOPICS.find((t) => t.key === 'group')!;
    expect(topic.label).toEqual({ en: 'House Church', es: 'Iglesia en Casa' });
    expect(topic.questions.en[0]).toBe('Do you feel genuinely known by the people in your house church?');
    expect(topic.questions.es[0]).toBe('¿Sientes que las personas en tu iglesia en casa te conocen genuinamente?');
  });
});
