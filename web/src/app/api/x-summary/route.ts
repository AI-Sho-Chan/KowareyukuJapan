import { NextRequest } from "next/server";
import { fetchUrlWithSsrfGuard } from '@/lib/ssrf';

function pick(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const m = html.match(re);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest){
  const url = req.nextUrl.searchParams.get('url');
  if(!url) return new Response(JSON.stringify({ok:false,error:'url is required'}),{status:400});
  try{
    const r = await fetchUrlWithSsrfGuard(url, { headers: { 'user-agent': 'Mozilla/5.0' }, timeoutMs: 5000 });
    if(!r.ok) throw new Error(`status ${r.status}`);
    const html = await r.text();
    // Xのページには og:title/og:description/og:image が埋め込まれていることが多い
    const text = pick(html,'og:title') || pick(html,'og:description');
    const image = pick(html,'og:image');
    return new Response(JSON.stringify({ok:true, text, image}), { headers: { 'content-type':'application/json' } });
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:e?.message ?? 'fetch error'}), {status:200});
  }
}


