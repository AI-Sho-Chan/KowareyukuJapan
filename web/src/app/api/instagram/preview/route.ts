export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { normalizeInstagramUrl } from '@/lib/instagram';

export async function GET(req: NextRequest) {
  const src = new URL(req.url).searchParams.get('url') || '';
  const page = normalizeInstagramUrl(src);
  try {
    const r = await fetch(page, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja,en;q=0.9' },
      redirect: 'manual', cache: 'no-store',
    });
    const html = await r.text();
    const pick = (p: string) => html.match(new RegExp(`<meta[^>]+property=["']${p}["'][^>]+content=["']([^"']+)`, 'i'))?.[1] || null;
    return NextResponse.json({
      ok: r.ok,
      url: page,
      title: pick('og:title'),
      description: pick('og:description'),
      image: pick('og:image'),
      video: pick('og:video') || pick('og:video:secure_url'),
    });
  } catch (e: any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:200 });
  }
}


