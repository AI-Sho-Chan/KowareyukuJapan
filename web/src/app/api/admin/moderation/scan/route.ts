import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TARGET_TERMS = [
  // 例示的なルール（必要に応じ強化）
  '日本人死ね', '天皇', '天皇制反対', '反日', '売国', '日本不要',
  'このサイト', '管理人死ね', 'ばか', 'クソ', '侮辱', '差別'
];

function scoreText(t: string): number {
  const s = String(t || '').toLowerCase();
  let score = 0;
  for (const term of TARGET_TERMS) { if (s.includes(term)) score += 30; }
  // 単純な罵倒語など
  if (/(死ね|ころす|殺す|馬鹿|ばか|fuck|shit)/i.test(s)) score += 40;
  return Math.min(score, 100);
}

export async function POST(req: NextRequest){
  try{
    if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
    const posts = await db.execute({ sql: `SELECT id, title, comment, url FROM posts ORDER BY created_at DESC LIMIT 500`, args: [] });
    let flagged = 0;
    for(const row of posts.rows as any[]){
      const text = [row.title||'', row.comment||'', row.url||''].join(' ');
      const score = scoreText(text);
      if (score >= 60){
        await db.execute({ sql: `INSERT INTO moderation_flags(post_id, reason, score) VALUES(?,?,?)`, args: [row.id, 'auto_flag', score] });
        flagged++;
      }
    }
    const list = await db.execute({ sql: `SELECT * FROM moderation_flags ORDER BY created_at DESC LIMIT 200`, args: [] });
    return NextResponse.json({ ok:true, flagged, items: list.rows });
  } catch(e:any){
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}

export async function GET(req: NextRequest){
  if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
  const list = await db.execute({ sql: `
    SELECT mf.*, p.title, p.url, p.comment
    FROM moderation_flags mf
    LEFT JOIN posts p ON p.id = mf.post_id
    ORDER BY mf.created_at DESC
    LIMIT 200
  `, args: [] });
  return NextResponse.json({ ok:true, items: list.rows });
}
