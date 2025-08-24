export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest){
  const url = req.nextUrl.searchParams.get('url');
  if(!url) return Response.json({ok:false,error:'url required'},{status:400});
  try{
    const r = await fetch(url, { method:'GET', redirect:'follow' });
    const xfo = (r.headers.get('x-frame-options')||'').toLowerCase();
    const csp = (r.headers.get('content-security-policy')||'').toLowerCase();
    const blocked = xfo.includes('deny') || xfo.includes('sameorigin') || csp.includes('frame-ancestors');
    return Response.json({ok:true, canEmbed: !blocked, xfo: xfo || null, csp: csp || null});
  }catch(e:any){
    return Response.json({ok:false,error:e?.message||'fetch failed'},{status:502});
  }
}
