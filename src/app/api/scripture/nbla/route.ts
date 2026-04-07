import { NextRequest, NextResponse } from 'next/server';

const SPANISH_BOOK_MAP: Record<string, string> = {
  'Génesis': 'GEN', 'Genesis': 'GEN',
  'Salmos': 'PSA', 'Salmo': 'PSA',
  'Proverbios': 'PRO',
  'Isaías': 'ISA', 'Isaias': 'ISA',
  'Jeremías': 'JER', 'Jeremias': 'JER',
  'Ezequiel': 'EZK',
  'Daniel': 'DAN',
  'Mateo': 'MAT',
  'Lucas': 'LUK',
  'Juan': 'JHN',
  'Hechos': 'ACT',
  'Romanos': 'ROM',
  '1 Corintios': '1CO',
  '2 Corintios': '2CO',
  'Gálatas': 'GAL', 'Galatas': 'GAL',
  'Efesios': 'EPH',
  'Filipenses': 'PHP',
  'Colosenses': 'COL',
  '1 Tesalonicenses': '1TH',
  '2 Timoteo': '2TI',
  'Tito': 'TIT',
  'Hebreos': 'HEB',
  'Santiago': 'JAS',
  '1 Pedro': '1PE',
  '2 Pedro': '2PE',
  '1 Juan': '1JN',
  'Apocalipsis': 'REV',
};

function spanishRefToPassageId(ref: string): string | null {
  // Parse "Juan 3:16" → "JHN.3.16"
  // Parse "Juan 3:16-17" → "JHN.3.16-JHN.3.17"
  // Parse "Salmos 119:105" → "PSA.119.105"
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const [, bookName, chapter, verseStart, verseEnd] = match;
  const usfm = SPANISH_BOOK_MAP[bookName.trim()];
  if (!usfm) return null;

  if (verseEnd) {
    return `${usfm}.${chapter}.${verseStart}-${usfm}.${chapter}.${verseEnd}`;
  }
  return `${usfm}.${chapter}.${verseStart}`;
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref) {
    return NextResponse.json({ error: 'Missing ref parameter' }, { status: 400 });
  }

  const bibleId = process.env.API_BIBLE_NBLA_ID;
  const apiKey = process.env.API_BIBLE_KEY;
  if (!bibleId || !apiKey) {
    return NextResponse.json({ error: 'API.Bible not configured' }, { status: 500 });
  }

  const passageId = spanishRefToPassageId(ref);
  if (!passageId) {
    return NextResponse.json({ error: `Could not parse reference: ${ref}` }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ 'content-type': 'text' });
    const res = await fetch(
      `https://rest.api.bible/v1/bibles/${bibleId}/passages/${passageId}?${params}`,
      { headers: { 'api-key': apiKey } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `API.Bible returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.data?.content?.trim() || '';

    if (!text) {
      return NextResponse.json({ error: 'No passage found' }, { status: 404 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('NBLA API error:', error);
    return NextResponse.json({ error: 'Failed to fetch scripture' }, { status: 500 });
  }
}
