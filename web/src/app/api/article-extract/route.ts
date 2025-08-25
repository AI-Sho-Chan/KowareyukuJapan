export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function toJina(u: string){ return `https://r.jina.ai/${u.startsWith('http') ? u : `https://${u}`}`; }

export async function GET(req: Request){
  const url = new URL(req.url).searchParams.get('url');
  if(!url) return NextResponse.json({ ok:false, error:'url required' }, { status:400 });

  try{
    // 1) Readability 優先
    try{
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language':'ja-JP,ja;q=0.9,en-US;q=0.3' }, redirect:'follow' });
      if (r.ok) {
        const html = await r.text();
        const dom = new JSDOM(html, { url, contentType: 'text/html' });
        const art = new Readability(dom.window.document, { keepClasses: false }).parse();
        const text = (art?.textContent || '').trim();
        if (text && text.length >= 120) {
          return NextResponse.json({ ok:true, text }, { headers:{ 'cache-control':'public, s-maxage=3600', 'vary':'accept-language' }});
        }
      }
    }catch{}

    // 2) フォールバック: r.jina.ai
    const jr = await fetch(toJina(url), { headers: { 'user-agent': UA, 'accept-language':'ja-JP,ja;q=0.9,en-US;q=0.3' } });
    if (!jr.ok) return NextResponse.json({ ok:false, error:`${jr.status}` }, { status:200 });
    const jtxt = (await jr.text()).trim();
    return NextResponse.json({ ok: !!jtxt, text: jtxt || '' }, { headers:{ 'cache-control':'public, s-maxage=1800', 'vary':'accept-language' }});
  } catch(e:any){
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:200 });
  }
}
