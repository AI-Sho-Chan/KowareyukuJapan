import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
    const [posts, hidden, eventsAll, eventsToday] = await Promise.all([
      db.execute({ sql: `SELECT COUNT(*) as c FROM posts`, args: [] }),
      db.execute({ sql: `SELECT COUNT(*) as c FROM posts WHERE is_published = 0`, args: [] }),
      db.execute({ sql: `SELECT type, COUNT(*) as c FROM events GROUP BY type`, args: [] }),
      db.execute({ sql: `SELECT type, COUNT(*) as c FROM events WHERE date(created_at, 'unixepoch') = date('now') GROUP BY type`, args: [] }),
    ]);
    const toMap = (rows:any[]) => Object.fromEntries(rows.map((r:any)=>[r.type, Number(r.c||0)]));
    const postsTotal = Number((posts.rows[0] as any)?.c || 0);
    const postsHidden = Number((hidden.rows[0] as any)?.c || 0);
    const eventsMap = toMap(eventsAll.rows as any[]);
    const eventsTodayMap = toMap(eventsToday.rows as any[]);
    return NextResponse.json({ ok:true, summary: { postsTotal, postsHidden, events: eventsMap, eventsToday: eventsTodayMap } });
  } catch(e:any){
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}

