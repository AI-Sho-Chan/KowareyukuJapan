export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

function parseBlocked(xfo: string, csp: string){
  const x = (xfo || '').toLowerCase();
  const c = (csp || '').toLowerCase();
  const byXfo = x.includes('deny') || x.includes('sameorigin');
  const byCsp = /frame-ancestors/i.test(c);
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
