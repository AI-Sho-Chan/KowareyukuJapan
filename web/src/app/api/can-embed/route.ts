export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

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
  const ac = new AbortController();
  const to = setTimeout(()=>ac.abort(), timeoutMs);
  try{
    let r = await fetch(u, { method:'HEAD', redirect:'follow', signal: ac.signal });
    if (r.status === 405 || r.status === 501) {
      r = await fetch(u, { method:'GET', redirect:'follow', signal: ac.signal, headers: { 'Range': 'bytes=0-0' } });
    }
    return r;
  } finally { clearTimeout(to); }
}

export async function GET(req: NextRequest){
  const url = req.nextUrl.searchParams.get('url');
  if(!url) return NextResponse.json({ ok:false, error:'url required' }, { status:400 });

  try{
    const r = await headThenGet(url);
    const xfo = r.headers.get('x-frame-options') || '';
    const csp = r.headers.get('content-security-policy') || '';
    const { blocked, byXfo, byCsp } = parseBlocked(xfo, csp);
    return NextResponse.json(
      { ok:true, canEmbed: !blocked, byXfo, byCsp, xfo: xfo || null, csp: csp || null, finalUrl: r.url },
      { headers: { 'cache-control': 'public, s-maxage=3600' } }
    );
  } catch (e:any){
    // 失敗時はフォールバックさせる
    return NextResponse.json({ ok:false, canEmbed:false, error:String(e?.message||e) }, { status:200 });
  }
}
