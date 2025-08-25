export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextRequest } from "next/server";
import { fetchMeta } from "@/lib/metadata";
import { mediaStore, postsStore, StoredPost, persistPostsToDisk, saveMediaToDisk } from "@/lib/store";
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import fs from 'node:fs';
import path from 'node:path';

type Post = {
  id: string;
  url?: string;
  media?: { type: "image" | "video"; name: string };
  title: string;
  comment?: string;
  handle?: string;
  tags?: string[];
  createdAt: number;
  ownerKey: string; // 簡易: 端末匿名ID
};

function getOwnerKey(req: NextRequest): string {
  const key = req.headers.get("x-client-key") || "anon";
  return key;
}

const FIXED_TAGS = [
  "治安/マナー","ニュース","政治/制度","動画","画像",
  "外国人犯罪","中国人","クルド人","媚中政治家","財務省",
  "官僚","左翼","保守","日本","帰化人","帰化人政治家"
];

function autoTags(input: { url?: string | null; mediaType?: "image"|"video"; comment?: string | null }): string[] {
  const tags: string[] = [];
  if (input.mediaType === 'image') tags.push('画像');
  if (input.mediaType === 'video') tags.push('動画');
  const url = (input.url || '').toLowerCase();
  if (/nhk|yomiuri|asahi|mainichi|nikkei|yahoo/.test(url)) tags.push('ニュース');
  if (/youtube\.com|youtu\.be/.test(url)) tags.push('動画');
  const text = (input.comment || '').toLowerCase();
  const map: Record<string,string> = {
    '中国': '中国人', 'チャイナ': '中国人', '中共': '中国人',
    'クルド': 'クルド人', '財務省': '財務省', '官僚': '官僚',
    '左翼': '左翼', '保守': '保守', '帰化': '帰化人', '日本': '日本'
  };
  for (const k in map){ if (text.includes(k)) tags.push(map[k]); }
  return Array.from(new Set(tags)).slice(0, 3);
}

export async function GET() {
  return new Response(JSON.stringify({ ok: true, posts: postsStore.slice(-50).reverse() }), { headers: { "content-type": "application/json" } });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const url = form.get("url") as string | null;
  const titleManual = (form.get("title") as string | null) || undefined;
  const comment = (form.get("comment") as string | null) || undefined;
  const handle = (form.get("handle") as string | null) || undefined;
  const tagsRaw = (form.getAll("tags") as string[]).filter(Boolean);
  const ownerKey = getOwnerKey(req);

  let mediaType: "image" | "video" | undefined;
  let mediaId: string | undefined;

  const file = form.get("file") as File | null;
  if (file && file.size > 0) {
    const ext = (file.name || "").toLowerCase();
    if (/(\.mp4|\.webm|\.mov)$/.test(ext)) mediaType = "video"; else mediaType = "image";
    const MAX_IMAGE = 8 * 1024 * 1024; // 画像アップロード上限
    const MAX_VIDEO = 60 * 1024 * 1024; // 動画アップロード上限
    if (mediaType === 'image' && file.size > MAX_IMAGE) {
      return new Response(JSON.stringify({ ok:false, error:'image-too-large', limit: MAX_IMAGE }), { status: 413, headers: { 'content-type':'application/json' } });
    }
    if (mediaType === 'video' && file.size > MAX_VIDEO) {
      return new Response(JSON.stringify({ ok:false, error:'video-too-large', limit: MAX_VIDEO }), { status: 413, headers: { 'content-type':'application/json' } });
    }

    const id = Math.random().toString(36).slice(2, 10);
    let outBuffer: Buffer;
    let outType: string;

    if (mediaType === 'image') {
      // サーバー側で最終再圧縮（1600px以内, JPEG80, メタデータ除去）
      const input = Buffer.from(await file.arrayBuffer());
      try {
        outBuffer = await sharp(input)
          .rotate()
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();
        outType = 'image/jpeg';
      } catch {
        outBuffer = input;
        outType = file.type || 'image/png';
      }
    } else {
      // 動画は最長3分、720p/H.264/AACにトランスコード
      const MAX_DURATION_SEC = 180;
      const tmpDir = path.join(process.cwd(), '.data', 'tmp');
      try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
      const inPath = path.join(tmpDir, `${id}-in`);
      const outPath = path.join(tmpDir, `${id}-out.mp4`);
      fs.writeFileSync(inPath, Buffer.from(await file.arrayBuffer()));

      try {
        if (ffmpegStatic) (ffmpeg as any).setFfmpegPath(ffmpegStatic as any);
        if ((ffprobe as any)?.path) (ffmpeg as any).setFfprobePath((ffprobe as any).path);

        const meta = await new Promise<any>((resolve, reject) => {
          (ffmpeg as any).ffprobe(inPath, (err: any, data: any) => err ? reject(err) : resolve(data));
        });
        const duration: number = meta?.format?.duration || 0;
        const streams: any[] = meta?.streams || [];
        const vStream = streams.find(s => s.codec_type === 'video');
        const height: number = vStream?.height || 0;
        if (duration && duration > MAX_DURATION_SEC) {
          try { fs.unlinkSync(inPath); } catch {}
          return new Response(JSON.stringify({ ok:false, error:'video-too-long', limitSec: MAX_DURATION_SEC }), { status: 413, headers: { 'content-type':'application/json' } });
        }

        await new Promise<void>((resolve, reject) => {
          let cmd = (ffmpeg as any)(inPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
              '-movflags +faststart',
              '-preset veryfast',
              '-crf 23'
            ])
            .output(outPath);
          if (height && height > 720) {
            cmd = cmd.size('?x720');
          }
          cmd.on('end', () => resolve())
             .on('error', (e: any) => reject(e))
             .run();
        });

        outBuffer = fs.readFileSync(outPath);
        outType = 'video/mp4';
      } catch {
        outBuffer = Buffer.from(await file.arrayBuffer());
        outType = file.type || 'video/mp4';
      } finally {
        try { fs.unlinkSync(inPath); } catch {}
        try { fs.unlinkSync(outPath); } catch {}
      }
    }

    // ディスクへ永続化＋メモリにも保持
    saveMediaToDisk(id, outType, ownerKey, outBuffer);
    mediaStore.set(id, { contentType: outType, data: outBuffer, ownerKey });
    mediaId = id;
  }

  let title = titleManual || "";
  const isX = !!url && /https?:\/\/(x\.com|twitter\.com)\//i.test(url);
  if (!title && url) {
    try {
      const meta = await fetchMeta(url);
      if (meta.title) title = meta.title;
    } catch (_) {}
  }
  if (!titleManual && isX) {
    if (!title || /javascript is not available\.?/i.test(title)) {
      title = "";
    }
  }
  if (!title && !url && mediaType) {
    title = mediaType === "image" ? "画像（ユーザー投稿）" : "動画（ユーザー投稿）";
  }
  if (!title && !isX) title = "(無題)";

  let tags: string[] | undefined = undefined;
  if (tagsRaw.length > 0) {
    tags = tagsRaw.filter(t => FIXED_TAGS.includes(t));
  } else {
    tags = autoTags({ url, mediaType, comment });
  }

  const id = Math.random().toString(36).slice(2, 10);
  const post: StoredPost = {
    id,
    url: url || undefined,
    media: mediaType && mediaId ? { type: mediaType, id: mediaId, url: `/api/posts/media/${mediaId}` } : undefined,
    title,
    comment,
    handle,
    tags,
    createdAt: Date.now(),
    ownerKey,
  };
  postsStore.push(post);
  persistPostsToDisk();
  return new Response(JSON.stringify({ ok: true, post }), { headers: { "content-type": "application/json" } });
}


