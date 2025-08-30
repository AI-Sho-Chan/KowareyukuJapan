import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  try{
    if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
    const q = req.nextUrl.searchParams.get('q')?.toLowerCase() || '';
    const rows = await db.execute({ sql: `SELECT id, title, url, comment, handle, owner_key, created_at, is_published FROM posts ORDER BY created_at DESC LIMIT 1000`, args: [] });
    let posts = (rows.rows as any[]).map(r => ({
      id: r.id,
      title: r.title,
      url: r.url,
      comment: r.comment,
      handle: r.handle,
      ownerKey: r.owner_key,
      createdAt: r.created_at,
      is_published: r.is_published,
    }));
    if(q){ posts = posts.filter(p => (p.title||'').toLowerCase().includes(q) || (p.comment||'').toLowerCase().includes(q) || (p.url||'').toLowerCase().includes(q)); }
    return NextResponse.json({ ok:true, posts });
  } catch(e:any){
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}

