export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { validateOutboundUrl } from '@/lib/ssrf';
import { logApi } from '@/lib/logger';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const pick = (html: string, name: string) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i');
  const m = html.match(re); return m ? m[1] : '';
};
const pickTitle = (h: string) => (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();

export async function GET(req: Request){
  const url = new URL(req.url).searchParams.get('url');
  if(!url) return NextResponse.json({ok:false,error:'url required'},{status:400});
  const started = Date.now();
  try{
    await validateOutboundUrl(url, { allowHttp: false });
    const r = await fetch(url, {
      headers: { 'user-agent': UA, 'accept-language':'ja-JP,ja;q=0.9,en-US;q=0.3' },
      redirect: 'follow',
    });
    if(!r.ok){ logApi({ name:'link-preview', start: started, ok:false, status:r.status, targetHost:new URL(url).hostname }); return NextResponse.json({ok:false,status:r.status},{status:r.status}); }
    const html = await r.text();

    const title = pick(html,'og:title') || pick(html,'twitter:title') || pickTitle(html);
    const desc  = pick(html,'og:description') || pick(html,'twitter:description') || '';
    const image = pick(html,'og:image') || pick(html,'twitter:image') || '';
    const site  = pick(html,'og:site_name') || new URL(url).hostname;

    logApi({ name:'link-preview', start: started, ok:true, status:200, targetHost:new URL(url).hostname });
    return NextResponse.json({
      ok:true,
      title: title?.trim() || null,
      description: desc?.trim() || null,
      image: image?.trim() || null,
      site,
      url
    }, { headers: { 'cache-control':'public, s-maxage=86400', 'vary':'accept-language' }});
  }catch(e:any){
    logApi({ name:'link-preview', start: started, ok:false, status:500, targetHost: (()=>{ try{ return new URL(url!).hostname }catch{return undefined}})(), error:String(e?.message||e) });
    return NextResponse.json({ok:false,error:String(e?.message||e)},{status:502});
  }
}


