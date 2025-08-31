import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  const r = await db.execute({ sql: `SELECT id, title, url, comment, handle, report_count, created_at, is_published, status FROM posts WHERE is_published = 0 ORDER BY created_at DESC LIMIT 500`, args: [] });
  const posts = (r.rows as any[]).map(row => ({
    id: row.id,
    title: row.title || '',
    url: row.url || undefined,
    comment: row.comment || undefined,
    handle: row.handle || undefined,
    report_count: Number(row.report_count || 0),
    auto_hidden: Number(row.report_count || 0) >= 3,
    auto_hidden_at: row.created_at,
    created_at: row.created_at,
  }));
  return NextResponse.json({ ok:true, posts });
}
