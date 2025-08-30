import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { PostsRepository } from '@/lib/db/posts-repository';

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
      for (const id of ids) {
        await repo.deletePost(String(id));
        changed++;
      }
      return NextResponse.json({ ok: true, changed });
    } else {
      return NextResponse.json({ ok: false, error: 'invalid action' }, { status: 400 });
    }
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: String(e?.message||e) }, { status: 500 });
  }
}

