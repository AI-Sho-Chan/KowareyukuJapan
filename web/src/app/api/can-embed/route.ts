export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { validateOutboundUrl, fetchUrlWithSsrfGuard } from '@/lib/ssrf';
import { logApi } from '@/lib/logger';

function parseBlocked(xfo: string, csp: string, ourOrigin?: string){
  const x = (xfo || '').toLowerCase();
  const c = (csp || '').toLowerCase();
  const byXfo = /\b(deny|sameorigin)\b/.test(x);

  let byCsp = false;
  const m = c.match(/frame-ancestors\s+([^;]+)/);
  if (m) {
    const list = m[1].trim();
    // 明示的に禁止されているときだけブロック扱い
    if (/\b'none'\b/.test(list)) byCsp = true;
    // それ以外（*, ドメイン列挙, 'self' 等）は判定を厳しくせず、実ブラウザに委ねる
  }
  return { blocked: byXfo || byCsp, byXfo, byCsp };
}

async function headThenGet(u: string, timeoutMs = 5000){
  let r = await fetchUrlWithSsrfGuard(u, { method:'HEAD', timeoutMs, allowHttp: true });
  if (r.status === 405 || r.status === 501) {
    r = await fetchUrlWithSsrfGuard(u, { method:'GET', timeoutMs, allowHttp: true, headers: { 'Range': 'bytes=0-0' } });
  }
  return r;
}

export async function GET(req: NextRequest){
  const url = req.nextUrl.searchParams.get('url');
  if(!url) return NextResponse.json({ ok:false, error:'url required' }, { status:400 });

  const started = Date.now();
  try{
    await validateOutboundUrl(url, { allowHttp: true });
    const r = await headThenGet(url);
    const xfo = r.headers.get('x-frame-options') || '';
    const csp = r.headers.get('content-security-policy') || '';
    const { blocked, byXfo, byCsp } = parseBlocked(xfo, csp);
    logApi({ name:'can-embed', start: started, ok:true, status:r.status, targetHost: new URL(url).hostname });
    return NextResponse.json(
      { ok:true, canEmbed: !blocked, byXfo, byCsp, xfo: xfo || null, csp: csp || null, finalUrl: r.url },
      { headers: { 'cache-control': 'public, s-maxage=3600' } }
    );
  } catch (e:any){
    logApi({ name:'can-embed', start: started, ok:false, status:500, targetHost: (()=>{ try{ return new URL(url!).hostname }catch{return undefined}})(), error:String(e?.message||e) });
    return NextResponse.json({ ok:false, canEmbed:false, error:String(e?.message||e) }, { status:502, headers: { 'cache-control': 'public, s-maxage=120' } });
  }
}
