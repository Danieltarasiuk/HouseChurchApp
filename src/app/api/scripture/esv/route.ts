import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref) {
    return NextResponse.json({ error: 'Missing ref parameter' }, { status: 400 });
  }

  const apiKey = process.env.ESV_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ESV API key not configured' }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      q: ref,
      'include-headings': 'false',
      'include-footnotes': 'false',
      'include-verse-numbers': 'true',
      'include-short-copyright': 'false',
      'include-passage-references': 'false',
    });

    const res = await fetch(`https://api.esv.org/v3/passage/text/?${params}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `ESV API returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.passages?.[0]?.trim() || '';

    if (!text) {
      return NextResponse.json({ error: 'No passage found' }, { status: 404 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('ESV API error:', error);
    return NextResponse.json({ error: 'Failed to fetch scripture' }, { status: 500 });
  }
}
