export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { fetchUrlWithSsrfGuard } from '@/lib/ssrf';

export async function GET(req: Request){
  const url = new URL(req.url).searchParams.get('url');
  if(!url) return NextResponse.json({ ok:false, error:'url required' }, { status:400 });
  try{
    const r = await fetchUrlWithSsrfGuard(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { timeoutMs: 5000 });
    if(!r.ok) return NextResponse.json({ ok:false }, { status:200 });
    const j = await r.json();
    return NextResponse.json({ ok:true, title: j?.title || null }, { headers: { 'cache-control': 'public, s-maxage=86400' } });
  }catch(e:any){
    return NextResponse.json({ ok:false, error: String(e?.message||e) }, { status:200 });
  }
}
