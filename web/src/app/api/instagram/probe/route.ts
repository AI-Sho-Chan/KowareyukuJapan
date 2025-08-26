export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { toEmbedUrl } from '@/lib/instagram';
import { validateOutboundUrl, fetchUrlWithSsrfGuard } from '@/lib/ssrf';
import { logApi } from '@/lib/logger';

const H = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  'Accept-Language': 'ja,en;q=0.9'
} as const;

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get('url') || '';
  const embed = toEmbedUrl(url);
  if (!embed) return NextResponse.json({ ok: false, reason: 'bad_url' }, { status: 400 });

  const started = Date.now();
  try {
    await validateOutboundUrl(embed, { allowHttp: false });
    const r = await fetchUrlWithSsrfGuard(embed, { headers: H, timeoutMs: 5000 });
    const status = r.status;
    const loc = r.headers.get('location') || '';
    const xfo = (r.headers.get('x-frame-options') || '').toLowerCase();
    const csp = (r.headers.get('content-security-policy') || '').toLowerCase();

    if (status >= 300 && status < 400 && loc.includes('/accounts/login'))
      return NextResponse.json({ ok: false, reason: 'login', status, location: loc });

    if ([404, 451, 403].includes(status))
      return NextResponse.json({ ok: false, reason: String(status), status });

    const html = await r.text();
    const hasOgImg = /property=["']og:image["'][^>]+content=/i.test(html);
    const hasOgVid = /property=["']og:video["'][^>]+content=/i.test(html);
    const unavailable = /(利用できません|not available|private|ログイン)/i.test(html);
    const blocked = /frame-ancestors\s+'none'/.test(csp) || /deny|sameorigin/.test(xfo);

    const ok = status === 200 && !unavailable && (hasOgImg || hasOgVid) && !blocked;
    logApi({ name:'ig-probe', start: started, ok, status, targetHost: new URL(embed).hostname });
    return NextResponse.json({ ok, status, hasOgImg, hasOgVid, unavailable, blocked }, { headers: { 'cache-control': 'public, s-maxage=600' } });
  } catch (e: any) {
    logApi({ name:'ig-probe', start: started, ok:false, status: 500, targetHost: new URL(embed).hostname, error: String(e?.message||e) });
    return NextResponse.json({ ok: false, reason: 'error', error: String(e?.message || e) }, { status: 502 });
  }
}


