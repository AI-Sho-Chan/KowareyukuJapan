export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

function toJina(u: string){
  return `https://r.jina.ai/${u.startsWith('http') ? u : `https://${u}`}`;
}

export async function GET(req: NextRequest){
  const url = req.nextUrl.searchParams.get('url');
  if(!url) return NextResponse.json({ ok:false, error:'url required' }, { status:400 });

  try{
    const ac = new AbortController();
    const to = setTimeout(()=>ac.abort(), 8000);
    const r = await fetch(toJina(url), {
      headers: { 'user-agent':'Mozilla/5.0', 'accept-language':'ja-JP,ja;q=0.9,en-US;q=0.3' },
      signal: ac.signal
    });
    clearTimeout(to);
    if(!r.ok) return NextResponse.json({ ok:false, error:`${r.status}` }, { status:200 });

    const text = (await r.text()).slice(0, 8000);
    return NextResponse.json(
      { ok:true, text },
      { headers: { 'cache-control':'public, s-maxage=3600', 'vary':'accept-language' } }
    );
  } catch(e:any){
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:200 });
  }
}
