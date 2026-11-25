import type { Language } from '@/lib/translations';

/**
 * What the church calls its groups. Everywhere else (database, code,
 * translation keys) they are "groups"; only the word people see comes from
 * here. PR 1.1 turns this into a per-church setting ("Life Group", "Small
 * Group", ...). Client-safe: plain data, no runtime imports.
 */
export interface GroupLabel {
  /** Singular, as written in a title: "House Church". */
  one: string;
  /** Plural, as written in a title: "House Churches". */
  other: string;
}

export const GROUP_LABEL: Record<Language, GroupLabel> = {
  en: { one: 'House Church', other: 'House Churches' },
  es: { one: 'Iglesia en Casa', other: 'Iglesias en Casa' },
};

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/**
 * Fills the label tokens in a translated string:
 *   {Group} {Groups}                    as written ("House Church")
 *   {group} {groups}                    lower case ("house church")
 *   {Group:sentence} {Groups:sentence}  sentence start ("House church")
 */
export function withGroupLabel(text: string, lang: Language): string {
  if (!text.includes('{')) return text;
  const { one, other } = GROUP_LABEL[lang];
  const tokens: [string, string][] = [
    ['{Group:sentence}', sentence(one)],
    ['{Groups:sentence}', sentence(other)],
    ['{Group}', one],
    ['{Groups}', other],
    ['{group}', one.toLowerCase()],
    ['{groups}', other.toLowerCase()],
  ];
  return tokens.reduce((s, [token, value]) => s.split(token).join(value), text);
}
