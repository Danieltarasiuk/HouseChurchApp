import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spanishBookToUsfm, normalizeBookName, MAPPED_BOOK_COUNT } from '@/lib/spanishBooks';

describe('Spanish Bible book names', () => {
  it('maps all 66 books', () => {
    expect(MAPPED_BOOK_COUNT).toBe(66);
  });

  it('no name or abbreviation maps to two different books', () => {
    const src = readFileSync(path.resolve(__dirname, '../src/lib/spanishBooks.ts'), 'utf8');
    const seen = new Map<string, string>();
    for (const m of src.matchAll(/\['([0-9A-Z]{3})', \[([^\]]+)\]\]/g)) {
      for (const name of m[2].split(',').map((x) => x.trim().replace(/^'|'$/g, ''))) {
        const key = normalizeBookName(name);
        if (seen.has(key)) expect(`${name} → ${seen.get(key)}`).toBe(`${name} → ${m[1]}`);
        seen.set(key, m[1]);
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(200); // names and abbreviations, all distinct
  });

  it.each([
    ['Génesis', 'GEN'], ['genesis', 'GEN'], ['Gn', 'GEN'],
    ['Éxodo', 'EXO'], ['Exodo', 'EXO'], ['Éx.', 'EXO'],
    ['Cantar de los Cantares', 'SNG'], ['Cantares', 'SNG'],
    ['Salmo', 'PSA'], ['Sal', 'PSA'],
    ['1 Samuel', '1SA'], ['1Samuel', '1SA'], ['I Samuel', '1SA'], ['1ª Samuel', '1SA'], ['Primera de Samuel', '1SA'], ['1 S', '1SA'],
    ['2 Reyes', '2KI'], ['II Reyes', '2KI'], ['2da Reyes', '2KI'],
    ['1 Corintios', '1CO'], ['1 Co.', '1CO'], ['primera corintios', '1CO'],
    ['3 Juan', '3JN'], ['III Juan', '3JN'], ['Tercera de Juan', '3JN'], ['3 Jn', '3JN'],
    ['Juan', 'JHN'], ['Jn', 'JHN'], ['Jonás', 'JON'], ['Jon', 'JON'], ['Judas', 'JUD'], ['Jueces', 'JDG'],
    ['Filipenses', 'PHP'], ['Fil', 'PHP'], ['Filemón', 'PHM'], ['Flm', 'PHM'],
    ['Santiago', 'JAS'], ['Stg', 'JAS'],
    ['Apocalipsis', 'REV'], ['Ap', 'REV'],
    ['  Hechos  ', 'ACT'], ['HCH', 'ACT'],
  ])('%s → %s', (name, code) => {
    expect(spanishBookToUsfm(name)).toBe(code);
  });

  it('returns null for an unknown book', () => {
    expect(spanishBookToUsfm('Macabeos')).toBeNull();
  });
});
