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
  '豐ｻ螳峨・繝槭リ繝ｼ','繝九Η繝ｼ繧ｹ','謾ｿ豐ｻ/蛻ｶ蠎ｦ','蜍慕判','逕ｻ蜒・,
  '螟門嵜莠ｺ迥ｯ鄂ｪ','荳ｭ蝗ｽ莠ｺ','繧ｯ繝ｫ繝我ｺｺ','蟐壻ｸｭ謾ｿ豐ｻ螳ｶ','雋｡蜍咏怐',
  '螳伜・','蟾ｦ鄙ｼ','菫晏ｮ・,'譌･譛ｬ','蟶ｰ蛹紋ｺｺ','蟶ｰ蛹紋ｺｺ謾ｿ豐ｻ螳ｶ'
];

function autoTags(input: { url?: string | null; mediaType?: 'image'|'video'; }): string[] {
  const t: string[] = [];
  if (input.mediaType === 'image') t.push('逕ｻ蜒・);
  if (input.mediaType === 'video') t.push('蜍慕判');
  const url = (input.url || '').toLowerCase();
  if (/nhk|yomiuri|asahi|mainichi|nikkei|yahoo/.test(url)) t.push('繝九Η繝ｼ繧ｹ');
  if (/youtube\.com|youtu\.be/.test(url)) t.push('蜍慕判');
  return Array.from(new Set(t)).slice(0, 3);
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(q.get('page') || '1'));
    // 譌｢螳壹・20莉ｶ縲∽ｸ企剞繧・000莉ｶ縺ｾ縺ｧ諡｡螟ｧ・育ｮ｡逅・判髱｢縺ｨ謨ｴ蜷茨ｼ・    const limit = Math.min(1000, Math.max(1, parseInt(q.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // DB蜿門ｾ暦ｼ医ち繧､繝繧｢繧ｦ繝井ｻ倥″・俄・ 螟ｱ謨・驕・ｻｶ譎ゅ・繝ｭ繝ｼ繧ｫ繝ｫJSON縺ｸ繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
    // DB蜆ｪ蜈医〒謨ｴ蜷域ｧ繧剃ｿ昴▽縺溘ａ縲√ち繧､繝繧｢繧ｦ繝医ｒ蟆代＠髟ｷ繧√↓
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
      // 繝ｭ繝ｼ繧ｫ繝ｫJSON繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ
      try {
        const dataDir = path.join(process.cwd(), '.data');
        const filePath = path.join(dataDir, 'posts.json');
        let items: any[] = [];
        try { const raw = fs.readFileSync(filePath, 'utf8'); const arr = JSON.parse(raw); if (Array.isArray(arr)) items = arr; } catch {}
        const sliced = items.slice(offset, offset + limit);
        return NextResponse.json({ ok: true, posts: sliced, pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) }, fallback: true });
      } catch (e2) {
        console.error('GET /api/posts local fallback failed', e2);
        throw e; // 蜈・・繧ｨ繝ｩ繝ｼ繧剃ｸ贋ｽ阪〒蜃ｦ逅・      }
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
  if (!title && !url) title = '・育┌鬘鯉ｼ・;

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
    // NG繝ｯ繝ｼ繝会ｼ亥ｼｷ蛹也沿・峨メ繧ｧ繝・け: 繧ｿ繧､繝医Ν/繧ｳ繝｡繝ｳ繝・URL
    try {
      const { NGWordFilterV2 } = await import('@/lib/security');
      const { checkDynamicNG } = await import('@/lib/security/ngwords-dynamic');
      const target = [title || '', comment || '', url || ''].join(' ');
      const ng = (NGWordFilterV2 as any).check?.(target);
      const dyn = checkDynamicNG(target);
      if (ng?.blocked || dyn.blocked) {
        return NextResponse.json({ ok: false, error: '遖∵ｭ｢繝ｯ繝ｼ繝峨′蜷ｫ縺ｾ繧後※縺・∪縺・ }, { status: 400 });
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

