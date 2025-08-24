import { NextRequest } from "next/server";

// Headlessレンダリング相当（簡易）: しばらく待ってから取得を再試行
async function fetchWithWait(url: string, waitMs = 1200) {
  await new Promise(r=>setTimeout(r, waitMs));
  return fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, next: { revalidate: 60 } });
}

function pick(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const m = html.match(re);
  return m ? m[1] : null;
}

function pickTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

export async function GET(req: NextRequest){
  const url = req.nextUrl.searchParams.get('url');
  if(!url) return new Response(JSON.stringify({ok:false,error:'url is required'}),{status:400});
  try{
    const r = await fetchWithWait(url, 1500);
    const html = await r.text();
    let title = pick(html,'og:title') || pick(html,'twitter:title') || pickTitle(html);
    if(title){ title = title.replace(/\s*[|｜\-]\s*[^|｜\-]+$/u,'').trim(); }
    return new Response(JSON.stringify({ok:true, title: title || null}), { headers: { 'content-type':'application/json' } });
  }catch(e:any){
    return new Response(JSON.stringify({ok:false,error:e?.message ?? 'render error'}), {status:200});
  }
}


