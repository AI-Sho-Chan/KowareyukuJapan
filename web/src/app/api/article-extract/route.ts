export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest){
  const url = req.nextUrl.searchParams.get('url');
  if(!url) return Response.json({ok:false,error:'url required'},{status:400});
  try{
    const normalized = url.replace(/^https?:\/\//,'https://');
    const r = await fetch(`https://r.jina.ai/${normalized}`);
    if(!r.ok) return Response.json({ok:false,error:`${r.status}`},{status:502});
    const text = await r.text();
    const excerpt = text.split('\n').slice(0,80).join('\n').slice(0,4000);
    return Response.json({ok:true, text: excerpt});
  }catch(e:any){
    return Response.json({ok:false,error:e?.message||'extract failed'},{status:502});
  }
}
