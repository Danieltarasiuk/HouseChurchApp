import { describe, it, expect } from 'vitest';
import { translations, translate } from '@/lib/translations';
import { DEFAULT_GROUP_LABELS, groupLabelsOf, withGroupLabel, type GroupLabels } from '@/lib/groupLabel';
import { CALENDAR_CATEGORIES } from '@/lib/calendarCategories';
import { PASTORAL_TOPICS } from '@/data/pastoral-topics';

/** CityChurch's row as migration 002 seeds it. */
const CITYCHURCH: GroupLabels = groupLabelsOf({
  group_label_singular_en: 'House Church',
  group_label_plural_en: 'House Churches',
  group_label_singular_es: 'Iglesia en Casa',
  group_label_plural_es: 'Iglesias en Casa',
});
const LIFE_GROUPS: GroupLabels = { en: { one: 'Life Group', other: 'Life Groups' }, es: { one: 'Grupo de Vida', other: 'Grupos de Vida' } };

describe('group label', () => {
  it('CityChurch still sees "House Church" / "Iglesia en Casa"', () => {
    expect(translate('en', 'nav.groups', CITYCHURCH)).toBe('House Churches');
    expect(translate('es', 'nav.groups', CITYCHURCH)).toBe('Iglesias en Casa');
    expect(translate('en', 'role.group_leader', CITYCHURCH)).toBe('House Church Pastor');
    expect(translate('es', 'role.group_leader', CITYCHURCH)).toBe('Pastor de Iglesia en Casa');
    expect(translate('en', 'group.noMembers', CITYCHURCH)).toBe('No members in this house church');
    expect(translate('es', 'group.created', CITYCHURCH)).toBe('Iglesia en casa creada exitosamente.');
    expect(translate('en', 'privacy.churchDesc', CITYCHURCH)).toMatch(/^Church-wide default .* House churches, pastors/);
  });

  it("another church sees its own word, and a church with none set sees 'Group'", () => {
    expect(translate('en', 'nav.groups', LIFE_GROUPS)).toBe('Life Groups');
    expect(translate('es', 'att.selectGroup', LIFE_GROUPS)).toBe('Selecciona una grupo de vida');
    expect(translate('en', 'nav.groups')).toBe('Groups');
    expect(translate('es', 'nav.groups', DEFAULT_GROUP_LABELS)).toBe('Grupos');
  });

  it('fills every token in both languages', () => {
    for (const labels of [CITYCHURCH, LIFE_GROUPS, DEFAULT_GROUP_LABELS]) {
      for (const lang of ['en', 'es'] as const) {
        for (const key of Object.keys(translations[lang])) {
          expect(translate(lang, key, labels), `${lang} ${key}`).not.toMatch(/\{Groups?(:sentence)?\}|\{groups?\}/);
        }
      }
    }
  });

  it('leaves other placeholders for the caller', () => {
    expect(withGroupLabel('{count} {groups} deactivated', 'en', CITYCHURCH)).toBe('{count} house churches deactivated');
  });

  it('the calendar category and pastoral topic carry tokens filled with the church label', () => {
    expect(withGroupLabel(CALENDAR_CATEGORIES.group.en, 'en', CITYCHURCH)).toBe('House Church');
    expect(withGroupLabel(CALENDAR_CATEGORIES.group.es, 'es', LIFE_GROUPS)).toBe('Grupo de Vida');
    const topic = PASTORAL_TOPICS.find((t) => t.key === 'group')!;
    expect(withGroupLabel(topic.label.es, 'es', CITYCHURCH)).toBe('Iglesia en Casa');
    expect(withGroupLabel(topic.questions.en[0], 'en', CITYCHURCH)).toBe('Do you feel genuinely known by the people in your house church?');
    expect(withGroupLabel(topic.questions.es[0], 'es', CITYCHURCH)).toBe('¿Sientes que las personas en tu iglesia en casa te conocen genuinamente?');
  });
});
