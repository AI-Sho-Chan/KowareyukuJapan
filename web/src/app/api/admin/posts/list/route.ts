import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  try{
    if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
    const sp = req.nextUrl.searchParams;
    const q = sp.get('q')?.toLowerCase() || '';
    const byHandle = sp.get('handle')?.toLowerCase() || '';
    const byDate = sp.get('date') || ''; // YYYY-MM-DD
    const sourcesParam = sp.get('source') || '';
    const sources = sourcesParam ? sourcesParam.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean) : [];
    const includeAll = req.nextUrl.searchParams.get('include') === 'all';
    const sql = includeAll
      ? `SELECT id, title, url, comment, handle, owner_key, created_at, is_published FROM posts ORDER BY created_at DESC LIMIT 1000`
      : `SELECT id, title, url, comment, handle, owner_key, created_at, is_published FROM posts WHERE is_published = 1 ORDER BY created_at DESC LIMIT 1000`;
    const rows = await db.execute({ sql, args: [] });
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
    const deriveSource = (u?: string): string => {
      const x = (u||'').toLowerCase();
      if (!x) return 'unknown';
      if (x.includes('youtube.com') || x.includes('youtu.be')) return 'youtube';
      if (x.includes('twitter.com') || x.includes('x.com')) return 'x';
      if (x.includes('instagram.com')) return 'instagram';
      if (x.includes('nhk.or.jp')) return 'nhk';
      if (x.includes('note.com')) return 'note';
      return 'web';
    };

    if(q){ posts = posts.filter(p => (p.title||'').toLowerCase().includes(q) || (p.comment||'').toLowerCase().includes(q) || (p.url||'').toLowerCase().includes(q)); }
    if(byHandle){ posts = posts.filter(p => (p.handle||'').toLowerCase().includes(byHandle)); }
    if(byDate){ posts = posts.filter(p => { const d = new Date(p.createdAt||''); if (isNaN(d.getTime())) return false; const s = d.toISOString().slice(0,10); return s === byDate; }); }
    if(sources.length){ posts = posts.filter(p => sources.includes(deriveSource(p.url))); }

    return NextResponse.json({ ok:true, posts });
  } catch(e:any){
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}
