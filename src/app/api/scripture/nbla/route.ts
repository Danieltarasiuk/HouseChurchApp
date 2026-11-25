import { NextRequest, NextResponse } from 'next/server';
import { requireViewer } from '@/lib/authz';
import { inChurch } from '@/lib/churchRoute';
import { spanishBookToUsfm } from '@/lib/spanishBooks';

function spanishRefToPassageId(ref: string): string | null {
  // Parse "Juan 3:16" → "JHN.3.16"
  // Parse "Juan 3:16-17" → "JHN.3.16-JHN.3.17"
  // Parse "Salmos 119:105" → "PSA.119.105"
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const [, bookName, chapter, verseStart, verseEnd] = match;
  const usfm = spanishBookToUsfm(bookName);
  if (!usfm) return null;

  if (verseEnd) {
    return `${usfm}.${chapter}.${verseStart}-${usfm}.${chapter}.${verseEnd}`;
  }
  return `${usfm}.${chapter}.${verseStart}`;
}

async function handleGET(req: NextRequest) {
  // Signed-in only: this proxies a paid API with the church's key.
  const { error } = await requireViewer();
  if (error) return error;

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

export const GET = inChurch(handleGET);
