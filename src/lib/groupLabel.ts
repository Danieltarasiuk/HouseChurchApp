import type { Language } from '@/lib/translations';

/**
 * What a church calls its groups ("House Church", "Life Group", ...). Inside
 * the app they are always "groups"; only the word people see comes from the
 * church's settings (churches.group_label_*). The server reads them from the
 * current church (currentChurch()); the browser gets them from the root
 * layout through LangProvider. Client-safe: plain data, no runtime imports.
 */
export interface GroupLabel {
  /** Singular, as written in a title: "House Church". */
  one: string;
  /** Plural, as written in a title: "House Churches". */
  other: string;
}

export type GroupLabels = Record<Language, GroupLabel>;

/** Used before a church is known, and as the database defaults. */
export const DEFAULT_GROUP_LABELS: GroupLabels = {
  en: { one: 'Group', other: 'Groups' },
  es: { one: 'Grupo', other: 'Grupos' },
};

/** The labels from a church row (churches.group_label_*). */
export function groupLabelsOf(church: {
  group_label_singular_en: string;
  group_label_plural_en: string;
  group_label_singular_es: string;
  group_label_plural_es: string;
}): GroupLabels {
  return {
    en: { one: church.group_label_singular_en, other: church.group_label_plural_en },
    es: { one: church.group_label_singular_es, other: church.group_label_plural_es },
  };
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/**
 * Fills the label tokens in a string:
 *   {Group} {Groups}                    as written ("House Church")
 *   {group} {groups}                    lower case ("house church")
 *   {Group:sentence} {Groups:sentence}  sentence start ("House church")
 */
export function withGroupLabel(text: string, lang: Language, labels: GroupLabels = DEFAULT_GROUP_LABELS): string {
  if (!text.includes('{')) return text;
  const { one, other } = labels[lang];
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
