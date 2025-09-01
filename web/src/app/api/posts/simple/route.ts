import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { fetchMeta } from '@/lib/metadata';
import fs from 'fs';
import path from 'path';
import { saveMediaToDisk } from '@/lib/store';
import { guardUpload } from '@/lib/security/upload-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
      const db = createClient({
        url: process.env.TURSO_DATABASE_URL || process.env.TURSO_DB_URL || '',
        authToken: process.env.TURSO_AUTH_TOKEN || ''
      });

      const result = await db.execute({
        sql: 'SELECT * FROM posts WHERE is_published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
        args: [limit, offset]
      });

      const countResult = await db.execute('SELECT COUNT(*) as total FROM posts WHERE is_published = 1');
      const total = Number((countResult.rows[0] as any).total);

      const posts = (result.rows as any[]).map((row) => {
        let title = (row as any).url as string;
        if ((row as any).metadata_json) {
          try {
            const metadata = JSON.parse((row as any).metadata_json as string);
            title = metadata.title || (row as any).url;
          } catch {}
        }
        let tags: string[] = [];
        if ((row as any).tags) {
          try { tags = JSON.parse((row as any).tags as string); } catch { tags = String((row as any).tags).split(','); }
        }
        return { ...row, title, tags };
      });

      // Merge local JSON posts (if any) so newly saved local entries also appear
      const localFile = path.join(process.cwd(), '.data', 'posts.json');
      let local: any[] = [];
      try {
        const raw = fs.readFileSync(localFile, 'utf8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          // Frontの表示基準と合わせ、公開済みのみ取り込む
          local = arr.filter((p: any) => p?.is_published === 1 || p?.isPublished === true);
        }
      } catch {}

      const combined = [...local, ...posts];
      const deduped = combined.filter((p, i, self) => self.findIndex(q => q.id === p.id) === i);
      // created_at/createdAt を見て降順に統一（新しいものが先頭）
      deduped.sort((a: any, b: any) => {
        const aTs = typeof a.createdAt === 'number' ? a.createdAt : (typeof a.created_at === 'string' ? Date.parse(a.created_at) : (typeof a.created_at === 'number' ? a.created_at : 0));
        const bTs = typeof b.createdAt === 'number' ? b.createdAt : (typeof b.created_at === 'string' ? Date.parse(b.created_at) : (typeof b.created_at === 'number' ? b.created_at : 0));
        return bTs - aTs;
      });
      const totalCombined = deduped.length;
      const sliced = deduped.slice(offset, offset + limit);

      return NextResponse.json({ ok: true, posts: sliced, pagination: { page, limit, total: totalCombined, totalPages: Math.ceil(totalCombined / limit) } });
    } catch (dbError) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Database error (production, no fallback):', dbError);
        return NextResponse.json({ ok: false, error: 'データの取得に失敗しました' }, { status: 500 });
      }
      console.error('Database error, falling back to local JSON (development):', dbError);
      const filePath = path.join(process.cwd(), '.data', 'posts.json');
      let items: any[] = [];
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) items = arr.filter((p: any) => p?.is_published === 1 || p?.isPublished === true);
      } catch {}
      const sliced = items.slice(offset, offset + limit);
      return NextResponse.json({ ok: true, posts: sliced, pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) } });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ ok: false, error: 'データの取得に失敗しました', message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const url = (form.get('url') as string) || undefined;
    const title = (form.get('title') as string) || undefined;
    const comment = (form.get('comment') as string) || undefined;
    const handle = (form.get('handle') as string) || '@guest';

    const dataDir = path.join(process.cwd(), '.data');
    try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
    const filePath = path.join(dataDir, 'posts.json');

    let arr: any[] = [];
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {}

    const id = Math.random().toString(36).slice(2, 10);
    const created_at = Date.now();
    
    // Optional media upload (development fallback)
    let media: { type: 'image' | 'video'; id: string; url: string } | undefined;
    const file = form.get('file') as File | null;
    if (file && file.size > 0) {
      const buf = Buffer.from(await file.arrayBuffer());
      const ct = (file.type as string) || 'application/octet-stream';
      const safe = await guardUpload(buf, ct, (file as any).name || undefined);
      if (!safe.ok) {
        return NextResponse.json({ ok:false, error: safe.error || 'invalid file' }, { status: 400 });
      }
      const mediaId = `${id}-m`;
      saveMediaToDisk(mediaId, safe.contentType || ct, 'local', buf);
      media = { type: safe.normalizedType!, id: mediaId, url: `/api/posts/media/${mediaId}` };
    }
    // Try to resolve title from URL if not provided
    let resolvedTitle = title;
    if (!resolvedTitle && url) {
      try {
        const meta = await fetchMeta(url);
        if (meta?.title) resolvedTitle = meta.title;
      } catch {}
    }

    const entry = {
      id,
      url,
      title: resolvedTitle || url || '',
      comment,
      handle,
      tags: [],
      media,
      owner_key: 'local',
      created_at,
      updated_at: created_at,
      is_published: 1,
      report_count: 0,
    };
    arr.unshift(entry);
    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2), 'utf8');

    return NextResponse.json({ ok: true, post: entry });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: 'Failed to save locally', message: String(error?.message || error) }, { status: 500 });
  }
}
