import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { PostsRepository } from '@/lib/db/posts-repository';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const repo = new PostsRepository();

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminSession(req)) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const { action, ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length) return NextResponse.json({ ok: false, error: 'ids required' }, { status: 400 });
    let changed = 0;
    if (action === 'hide' || action === 'publish') {
      const isPublished = action === 'publish';
      for (const id of ids) {
        await repo.updatePost(String(id), { isPublished });
        changed++;
      }
      return NextResponse.json({ ok: true, changed });
    } else if (action === 'delete') {
      // ソフト削除: 公開停止 + hidden ステータス（is_deleted 列があれば 1 ）
      for (const id of ids) {
        try {
          await db.execute({ sql: `UPDATE posts SET is_published = 0, status = 'hidden', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, args: [String(id)] });
          try { await db.execute({ sql: `UPDATE posts SET is_deleted = 1 WHERE id = ?`, args: [String(id)] }); } catch { /* ignore if column missing */ }
          changed++;
        } catch {}
      }
      return NextResponse.json({ ok: true, changed, softDeleted: true });
    } else {
      return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
    }
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message||e) }, { status: 500 });
  }
}
