/**
 * Spanish Bible book names → USFM codes (used by API.Bible), for all 66
 * books, with the common abbreviations and spelling variants. Matching
 * ignores accents, case, periods and extra spaces, and accepts number
 * prefixes written as 1 / 1a / 1ª / 1ra / I / Primera (de) …
 */

const BOOKS: [string, string[]][] = [
  // Old Testament
  ['GEN', ['Génesis', 'Gn', 'Gen', 'Gén']],
  ['EXO', ['Éxodo', 'Ex', 'Éx', 'Exo', 'Éxo']],
  ['LEV', ['Levítico', 'Lv', 'Lev']],
  ['NUM', ['Números', 'Nm', 'Núm', 'Num']],
  ['DEU', ['Deuteronomio', 'Dt', 'Deut']],
  ['JOS', ['Josué', 'Jos']],
  ['JDG', ['Jueces', 'Jue', 'Jc']],
  ['RUT', ['Rut', 'Rt']],
  ['1SA', ['1 Samuel', '1 S', '1 Sa', '1 Sam']],
  ['2SA', ['2 Samuel', '2 S', '2 Sa', '2 Sam']],
  ['1KI', ['1 Reyes', '1 R', '1 Re', '1 Rey']],
  ['2KI', ['2 Reyes', '2 R', '2 Re', '2 Rey']],
  ['1CH', ['1 Crónicas', '1 Cr', '1 Cro', '1 Crón']],
  ['2CH', ['2 Crónicas', '2 Cr', '2 Cro', '2 Crón']],
  ['EZR', ['Esdras', 'Esd']],
  ['NEH', ['Nehemías', 'Neh']],
  ['EST', ['Ester', 'Est']],
  ['JOB', ['Job']],
  ['PSA', ['Salmos', 'Salmo', 'Sal', 'Sl']],
  ['PRO', ['Proverbios', 'Pr', 'Pro', 'Prov']],
  ['ECC', ['Eclesiastés', 'Ec', 'Ecl', 'Ecle', 'Qohélet']],
  ['SNG', ['Cantares', 'Cantar de los Cantares', 'Cantar de Cantares', 'Cnt', 'Cant']],
  ['ISA', ['Isaías', 'Is', 'Isa']],
  ['JER', ['Jeremías', 'Jer', 'Jr']],
  ['LAM', ['Lamentaciones', 'Lm', 'Lam']],
  ['EZK', ['Ezequiel', 'Ez', 'Eze']],
  ['DAN', ['Daniel', 'Dn', 'Dan']],
  ['HOS', ['Oseas', 'Os']],
  ['JOL', ['Joel', 'Jl']],
  ['AMO', ['Amós', 'Am']],
  ['OBA', ['Abdías', 'Abd']],
  ['JON', ['Jonás', 'Jon']],
  ['MIC', ['Miqueas', 'Mi', 'Miq']],
  ['NAM', ['Nahúm', 'Nah', 'Na']],
  ['HAB', ['Habacuc', 'Hab', 'Ha']],
  ['ZEP', ['Sofonías', 'Sof']],
  ['HAG', ['Hageo', 'Hag', 'Ag']],
  ['ZEC', ['Zacarías', 'Zac', 'Za']],
  ['MAL', ['Malaquías', 'Mal', 'Ml']],
  // New Testament
  ['MAT', ['Mateo', 'Mt', 'Mat']],
  ['MRK', ['Marcos', 'Mr', 'Mc', 'Mar', 'Marc']],
  ['LUK', ['Lucas', 'Lc', 'Luc']],
  ['JHN', ['Juan', 'Jn']],
  ['ACT', ['Hechos', 'Hch', 'Hech', 'Hechos de los Apóstoles']],
  ['ROM', ['Romanos', 'Ro', 'Rom', 'Rm']],
  ['1CO', ['1 Corintios', '1 Co', '1 Cor']],
  ['2CO', ['2 Corintios', '2 Co', '2 Cor']],
  ['GAL', ['Gálatas', 'Gá', 'Gal', 'Ga']],
  ['EPH', ['Efesios', 'Ef', 'Efe']],
  ['PHP', ['Filipenses', 'Fil', 'Flp']],
  ['COL', ['Colosenses', 'Col']],
  ['1TH', ['1 Tesalonicenses', '1 Ts', '1 Tes']],
  ['2TH', ['2 Tesalonicenses', '2 Ts', '2 Tes']],
  ['1TI', ['1 Timoteo', '1 Ti', '1 Tim']],
  ['2TI', ['2 Timoteo', '2 Ti', '2 Tim']],
  ['TIT', ['Tito', 'Tit', 'Tt']],
  ['PHM', ['Filemón', 'Flm', 'Filem']],
  ['HEB', ['Hebreos', 'He', 'Heb']],
  ['JAS', ['Santiago', 'Stg', 'Sant', 'Snt']],
  ['1PE', ['1 Pedro', '1 P', '1 Pe', '1 Ped']],
  ['2PE', ['2 Pedro', '2 P', '2 Pe', '2 Ped']],
  ['1JN', ['1 Juan', '1 Jn']],
  ['2JN', ['2 Juan', '2 Jn']],
  ['3JN', ['3 Juan', '3 Jn']],
  ['JUD', ['Judas', 'Jud', 'Jds']],
  ['REV', ['Apocalipsis', 'Ap', 'Apoc', 'Apocal']],
];

const ORDINALS: Record<string, string> = {
  '1': '1', 'i': '1', '1a': '1', '1ª': '1', '1o': '1', '1º': '1', '1ra': '1', '1ro': '1', 'primera': '1', 'primer': '1', 'primero': '1',
  '2': '2', 'ii': '2', '2a': '2', '2ª': '2', '2o': '2', '2º': '2', '2da': '2', '2do': '2', 'segunda': '2', 'segundo': '2',
  '3': '3', 'iii': '3', '3a': '3', '3ª': '3', '3o': '3', '3º': '3', '3ra': '3', '3ro': '3', 'tercera': '3', 'tercer': '3', 'tercero': '3',
};

/** "1ª de Corintios." / "I corintios" / "1Corintios" → "1 corintios". */
export function normalizeBookName(name: string): string {
  let s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents (ª and º are not combining marks)
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // "1corintios" → "1 corintios"
  s = s.replace(/^([123])(?=[a-zªº]{3,})(?!a |ª |o |º |ra |ro |da |do )/, '$1 ');
  const m = s.match(/^(\S+)\s+(?:de\s+)?(.+)$/);
  if (m && ORDINALS[m[1]]) s = `${ORDINALS[m[1]]} ${m[2]}`;
  return s;
}

const LOOKUP = new Map<string, string>();
for (const [code, names] of BOOKS) {
  for (const n of names) LOOKUP.set(normalizeBookName(n), code);
}

/** USFM code for a Spanish book name or abbreviation, or null. */
export function spanishBookToUsfm(name: string): string | null {
  return LOOKUP.get(normalizeBookName(name)) ?? null;
}

/** Number of distinct books mapped (66). */
export const MAPPED_BOOK_COUNT = new Set(BOOKS.map(([code]) => code)).size;
