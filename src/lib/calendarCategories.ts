/**
 * Leadership calendar categories — the single source of truth for labels,
 * FullCalendar colors and Google Calendar colorIds. Client-safe (no imports).
 *
 * Google colorIds are the fixed event palette:
 * 1 Lavender, 3 Grape, 4 Flamingo, 5 Banana, 6 Tangerine, 7 Peacock,
 * 8 Graphite, 9 Blueberry, 10 Basil, 11 Tomato.
 */

export const CALENDAR_CATEGORY_KEYS = [
  'worship_night',
  'house_church',
  'men_women_marriage',
  'brunch',
  'english_gathering',
  'special_event',
  'advent',
  'holiday',
  'school',
  'reminder',
] as const;

export type CalendarCategory = (typeof CALENDAR_CATEGORY_KEYS)[number];

export interface CalendarCategoryInfo {
  en: string;
  es: string;
  color: string;
  googleColorId: string;
  /** Informational only: pushed to Google as "free" so it blocks no one's time. */
  informational: boolean;
}

export const CALENDAR_CATEGORIES: Record<CalendarCategory, CalendarCategoryInfo> = {
  worship_night:      { en: 'Worship Night',          es: 'Noche de Adoración',              color: '#7c3aed', googleColorId: '3',  informational: false },
  house_church:       { en: 'House Church',           es: 'Iglesia en Casa',                 color: '#2563eb', googleColorId: '9',  informational: false },
  men_women_marriage: { en: 'Men / Women / Marriage', es: 'Hombres / Mujeres / Matrimonios', color: '#db2777', googleColorId: '4',  informational: false },
  brunch:             { en: 'Brunch',                 es: 'Brunch',                          color: '#ca8a04', googleColorId: '5',  informational: false },
  english_gathering:  { en: 'English Gathering',      es: 'Reunión en Inglés',               color: '#0d9488', googleColorId: '7',  informational: false },
  special_event:      { en: 'Special Event',          es: 'Evento Especial',                 color: '#ea580c', googleColorId: '6',  informational: false },
  advent:             { en: 'Advent',                 es: 'Adviento',                        color: '#a78bfa', googleColorId: '1',  informational: false },
  holiday:            { en: 'Holiday',                es: 'Feriado',                         color: '#dc2626', googleColorId: '11', informational: true },
  school:             { en: 'School (M-DCPS)',        es: 'Escuela (M-DCPS)',                color: '#16a34a', googleColorId: '10', informational: true },
  reminder:           { en: 'Reminder',               es: 'Recordatorio',                    color: '#6b7280', googleColorId: '8',  informational: true },
};

export function isCalendarCategory(value: unknown): value is CalendarCategory {
  return typeof value === 'string' && (CALENDAR_CATEGORY_KEYS as readonly string[]).includes(value);
}
