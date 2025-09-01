export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { fetchMeta } from '@/lib/metadata';
import { PostsRepository } from '@/lib/db/posts-repository';
import { setupDatabase } from '@/lib/db/init';
import { saveMediaToDisk } from '@/lib/store';

const postsRepo = new PostsRepository();

function getOwnerKey(req: NextRequest): string {
  return req.headers.get('x-client-key') || 'anon';
}

function autoTags(input: { url?: string | null; mediaType?: 'image'|'video' }): string[] {
  const tags: string[] = [];
  if (input.mediaType === 'image') tags.push('画像');
  if (input.mediaType === 'video') tags.push('動画');
  const url = (input.url || '').toLowerCase();
  if (/nhk|yomiuri|asahi|mainichi|nikkei|yahoo/.test(url)) tags.push('ニュース');
  if (/youtube\.com|youtu\.be/.test(url)) tags.push('動画');
  return Array.from(new Set(tags)).slice(0, 3);
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(q.get('page') || '1'));
    const limit = Math.min(1000, Math.max(1, parseInt(q.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const timeoutMs = 5000;
    const dbPromise = (async () => {
      await setupDatabase();
      const posts = await postsRepo.getAllPosts({ limit, offset, includeUnpublished: false });
      const total = await postsRepo.getPostsCount(false);
      return { posts, total };
    })();
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs));

    try {
      const res = await Promise.race([dbPromise, timeout]) as { posts: any[]; total: number };
      const { posts, total } = res;
      return NextResponse.json({ ok: true, posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, fallback: false });
    } catch {
      // Fallback to local JSON (development only)
      try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const dataDir = path.join(process.cwd(), '.data');
        const filePath = path.join(dataDir, 'posts.json');
        let items: any[] = [];
        try { const raw = fs.readFileSync(filePath, 'utf8'); const arr = JSON.parse(raw); if (Array.isArray(arr)) items = arr; } catch {}
        const sliced = items.slice(offset, offset + limit);
        return NextResponse.json({ ok: true, posts: sliced, pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) }, fallback: true });
      } catch (e2) {
        console.error('GET /api/posts local fallback failed', e2);
        return NextResponse.json({ ok: false, error: 'Failed to fetch posts' }, { status: 500 });
      }
    }
  } catch (e) {
    console.error('GET /api/posts error', e);
    return NextResponse.json({ ok: false, error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await setupDatabase();
  const ownerKey = getOwnerKey(req);
  const form = await req.formData();

  const url = (form.get('url') as string) || undefined;
  const titleManual = ((form.get('title') as string) || '').trim();
  const comment = ((form.get('comment') as string) || '').trim() || undefined;
  const handle = ((form.get('handle') as string) || '').trim() || undefined;
  const tagsRaw = (form.getAll('tags') as string[]).filter(Boolean);

  // Resolve title
  let title = titleManual;
  if (!title && url) {
    try { const meta = await fetchMeta(url); if (meta?.title) title = meta.title; } catch {}
  }
  if (!title) title = url || '';

  // Prepare tags
  let tags: string[] | undefined = undefined;
  if (tagsRaw.length > 0) {
    tags = tagsRaw.slice(0, 5);
  } else {
    tags = autoTags({ url, mediaType: undefined });
  }

  // Optional media upload (save as-is)
  let media: { type: 'image'|'video'; url: string } | undefined;
  const file = form.get('file') as File | null;
  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const ct = (file.type as string) || 'application/octet-stream';
    const mediaId = Math.random().toString(36).slice(2, 10) + '-m';
    saveMediaToDisk(mediaId, ct, ownerKey, buf);
    const isVideo = /^video\//i.test(ct);
    media = { type: isVideo ? 'video' : 'image', url: `/api/posts/media/${mediaId}` };
  }

  try {
    const post = await postsRepo.createPost({
      title,
      url,
      comment,
      handle,
      ownerKey,
      tags,
      media,
    });
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.warn('DB create failed, falling back to local JSON:', (error as any)?.message);
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const dataDir = path.join(process.cwd(), '.data');
      try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
      const filePath = path.join(dataDir, 'posts.json');
      let arr: any[] = [];
      try { const raw = fs.readFileSync(filePath, 'utf8'); const j = JSON.parse(raw); if (Array.isArray(j)) arr = j; } catch {}
      const entry = {
        id: Math.random().toString(36).slice(2, 10),
        title,
        url,
        comment,
        handle: handle || '@guest',
        owner_key: ownerKey,
        tags,
        media,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_published: 1,
        report_count: 0,
      };
      arr.unshift(entry);
      fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');
      return NextResponse.json({ ok: true, post: entry });
    } catch (e) {
      console.error('Local JSON fallback failed', e);
      return NextResponse.json({ ok: false, error: 'Failed to create post' }, { status: 500 });
    }
  }
}
