export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { normalizeInstagramUrl } from '@/lib/instagram';
import { validateOutboundUrl, fetchUrlWithSsrfGuard } from '@/lib/ssrf';
import { logApi } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const src = new URL(req.url).searchParams.get('url') || '';
  const page = normalizeInstagramUrl(src);
  const started = Date.now();
  try {
    await validateOutboundUrl(page, { allowHttp: false });
    const r = await fetchUrlWithSsrfGuard(page, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja,en;q=0.9' }, timeoutMs: 5000 });
    const html = await r.text();
    const pick = (p: string) => html.match(new RegExp(`<meta[^>]+property=["']${p}["'][^>]+content=["']([^"']+)`, 'i'))?.[1] || null;
    logApi({ name:'ig-preview', start: started, ok: r.ok, status: r.status, targetHost: new URL(page).hostname });
    return NextResponse.json({
      ok: r.ok,
      url: page,
      title: pick('og:title'),
      description: pick('og:description'),
      image: pick('og:image'),
      video: pick('og:video') || pick('og:video:secure_url'),
    }, { headers: { 'cache-control': 'public, s-maxage=1800', 'vary': 'accept-language' } });
  } catch (e: any) {
    logApi({ name:'ig-preview', start: started, ok:false, status: 500, targetHost: new URL(page).hostname, error: String(e?.message||e) });
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:502 });
  }
}


