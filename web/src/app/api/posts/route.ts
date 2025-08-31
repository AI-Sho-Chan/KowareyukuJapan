export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { fetchMeta } from '@/lib/metadata';
import { PostsRepository } from '@/lib/db/posts-repository';
import { setupDatabase } from '@/lib/db/init';
import { saveMediaToDisk } from '@/lib/store';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import fs from 'node:fs';
import path from 'node:path';

const postsRepo = new PostsRepository();

function getOwnerKey(req: NextRequest): string {
  return req.headers.get('x-client-key') || 'anon';
}

const FIXED_TAGS = [
  '治安・マナー','ニュース','政治/制度','動画','画像',
  '外国人犯罪','中国人','クルド人','媚中政治家','財務省',
  '官僚','左翼','保守','日本','帰化人','帰化人政治家'
];

function autoTags(input: { url?: string | null; mediaType?: 'image'|'video'; }): string[] {
  const t: string[] = [];
  if (input.mediaType === 'image') t.push('画像');
  if (input.mediaType === 'video') t.push('動画');
  const url = (input.url || '').toLowerCase();
  if (/nhk|yomiuri|asahi|mainichi|nikkei|yahoo/.test(url)) t.push('ニュース');
  if (/youtube\.com|youtu\.be/.test(url)) t.push('動画');
  return Array.from(new Set(t)).slice(0, 3);
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(q.get('page') || '1'));
    // 既定は20件、上限を1000件まで拡大（管理画面と整合）
    const limit = Math.min(1000, Math.max(1, parseInt(q.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // DB取得（タイムアウト付き）→ 失敗/遅延時はローカルJSONへフォールバック
    // DB優先で整合性を保つため、タイムアウトを少し長めに
    const timeoutMs = 5000;
    const dbPromise = (async () => {
      await setupDatabase();
      const posts = await postsRepo.getAllPosts({ limit, offset, includeUnpublished: false });
      const total = await postsRepo.getPostsCount(false);
      return { posts, total };
    })();

    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs));

    let posts: any[] = [];
    let total = 0;
    try {
      const res = await Promise.race([dbPromise, timeout]) as { posts: any[]; total: number };
      posts = res.posts; total = res.total;
      return NextResponse.json({ ok: true, posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, fallback: false });
    } catch (e: any) {
      // ローカルJSONフォールバック
      try {
        const dataDir = path.join(process.cwd(), '.data');
        const filePath = path.join(dataDir, 'posts.json');
        let items: any[] = [];
        try { const raw = fs.readFileSync(filePath, 'utf8'); const arr = JSON.parse(raw); if (Array.isArray(arr)) items = arr; } catch {}
        const sliced = items.slice(offset, offset + limit);
        return NextResponse.json({ ok: true, posts: sliced, pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) }, fallback: true });
      } catch (e2) {
        console.error('GET /api/posts local fallback failed', e2);
        throw e; // 元のエラーを上位で処理
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
  if (!title && !url) title = '（無題）';

  // Prepare tags
  let tags: string[] | undefined = undefined;
  if (tagsRaw.length > 0) {
    tags = tagsRaw.filter((t) => FIXED_TAGS.includes(t));
  } else {
    tags = autoTags({ url, mediaType: undefined });
  }

  // Optional media upload (dev convenience)
  let media: { type: 'image'|'video'; url: string } | undefined;
  const file = form.get('file') as File | null;
  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    let ct = (file.type as string) || 'application/octet-stream';
    const name = (file.name || '').toLowerCase();
    const isVideo = /^video\//i.test(ct) || /\.(mp4|webm|mov|m4v|avi)$/i.test(name);
    const id = Math.random().toString(36).slice(2, 10) + '-m';

    if (isVideo) {
      // Try to transcode to MP4 (H.264/AAC) for compatibility
      try {
        if (ffmpegStatic) (ffmpeg as any).setFfmpegPath(ffmpegStatic as any);
        if ((ffprobeStatic as any)?.path) (ffmpeg as any).setFfprobePath((ffprobeStatic as any).path);
        const tmpDir = path.join(process.cwd(), '.data', 'tmp');
        fs.mkdirSync(tmpDir, { recursive: true });
        const inPath = path.join(tmpDir, `${id}-in`);
        const outPath = path.join(tmpDir, `${id}-out.mp4`);
        fs.writeFileSync(inPath, buf);

        await new Promise<void>((resolve, reject) => {
          let cmd = (ffmpeg as any)(inPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
              '-movflags +faststart', // place moov atom at the front for fast metadata
              '-preset veryfast',     // speed/size tradeoff
              '-crf 23',              // quality (lower is better)
              '-pix_fmt yuv420p',     // broad compatibility
              '-vf scale=-2:720',     // cap height at 720, keep aspect ratio
              '-ac 2',                // stereo
              '-ar 48000'             // 48kHz audio
            ])
            .format('mp4')
            .output(outPath);
          cmd.on('end', () => resolve()).on('error', (e: any) => reject(e)).run();
        });

        const out = fs.readFileSync(outPath);
        saveMediaToDisk(id, 'video/mp4', ownerKey, out);
        media = { type: 'video', url: `/api/posts/media/${id}` };
        ct = 'video/mp4';
        try { fs.unlinkSync(inPath); fs.unlinkSync(outPath); } catch {}
      } catch {
        // Fallback: save original
        saveMediaToDisk(id, ct, ownerKey, buf);
        media = { type: 'video', url: `/api/posts/media/${id}` };
      }
    } else {
      // Image as-is
      saveMediaToDisk(id, ct, ownerKey, buf);
      media = { type: 'image', url: `/api/posts/media/${id}` };
    }
  }

  try {
    // NGワード（強化版）チェック: タイトル/コメント/URL
    try {
      const { NGWordFilterV2 } = await import('@/lib/security');
      const { checkDynamicNG } = await import('@/lib/security/ngwords-dynamic');
      const target = [title || '', comment || '', url || ''].join(' ');
      const ng = (NGWordFilterV2 as any).check?.(target);
      const dyn = checkDynamicNG(target);
      if (ng?.blocked || dyn.blocked) {
        return NextResponse.json({ ok: false, error: '禁止ワードが含まれています' }, { status: 400 });
      }
    } catch {}

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
      const dataDir = path.join(process.cwd(), '.data');
      fs.mkdirSync(dataDir, { recursive: true });
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
        created_at: Date.now(),
        updated_at: Date.now(),
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
