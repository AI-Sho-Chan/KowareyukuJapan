export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextRequest, NextResponse } from "next/server";
import { z } from 'zod';
import { fileTypeFromBuffer } from 'file-type';
import { fetchMeta } from "@/lib/metadata";
import { PostsRepository } from "@/lib/db/posts-repository";
import {
  NGWordFilterV2,
  RateLimiter,
  AuditLogger,
  AuditAction,
  AuditSeverity,
  isBlocked,
  getClientIP,
  getRateLimitHeaders,
  GeoBlocker,
  AdvancedProtection,
} from "@/lib/security";
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'node:fs';
import path from 'node:path';

const postsRepo = new PostsRepository();

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

export async function GET(req: NextRequest) {
  try {
    // レート制限チェック
    const ip = getClientIP(req as any);
    const rateLimitResult = await RateLimiter.checkIP(ip, 'api:read');
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests' },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      );
    }
    
    const posts = await postsRepo.getAllPosts({ limit: 50 });
    return NextResponse.json(
      { ok: true, posts: posts.reverse() },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error('Error fetching posts:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to fetch posts' }), { 
      status: 500,
      headers: { "content-type": "application/json" } 
    });
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIP(req as any);
  const ownerKey = getOwnerKey(req);
  const headers = req.headers;
  
  // 地理的ブロックチェック
  const geoBlock = await GeoBlocker.shouldBlockAccess(ip, headers);
  if (geoBlock.shouldBlock) {
    await AuditLogger.log({
      action: AuditAction.IP_BLOCKED,
      severity: AuditSeverity.WARNING,
      userId: ownerKey,
      ipAddress: ip,
      details: { 
        blocked: true, 
        reason: geoBlock.reason,
        country: geoBlock.country,
        isVPN: geoBlock.isVPN,
      },
    });
    return NextResponse.json(
      { ok: false, error: geoBlock.reason },
      { status: 403 }
    );
  }
  
  // デバイスフィンガープリント生成
  const fingerprint = AdvancedProtection.generateFingerprint(headers, ip);
  
  // 脅威評価
  const threatAssessment = await AdvancedProtection.assessThreat(
    ownerKey,
    ip,
    fingerprint,
    'post_create'
  );
  
  if (threatAssessment.shouldBlock) {
    await AuditLogger.log({
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.CRITICAL,
      userId: ownerKey,
      ipAddress: ip,
      details: {
        blocked: true,
        threatLevel: threatAssessment.threatLevel,
        reasons: threatAssessment.reasons,
        blockDuration: threatAssessment.blockDuration,
        fingerprint,
      },
    });
    return NextResponse.json(
      { 
        ok: false, 
        error: '不審なアクティビティが検出されました。しばらく時間を置いてから再度お試しください。',
        threatLevel: threatAssessment.threatLevel,
      },
      { status: 403 }
    );
  }
  
  // 既存のブロックチェック
  const blockStatus = await isBlocked(ownerKey, ip);
  if (blockStatus.blocked) {
    await AuditLogger.log({
      action: AuditAction.POST_CREATE,
      severity: AuditSeverity.WARNING,
      userId: ownerKey,
      ipAddress: ip,
      details: { blocked: true, reason: blockStatus.reason },
    });
    return NextResponse.json(
      { ok: false, error: 'You are blocked from posting' },
      { status: 403 }
    );
  }
  
  // レート制限チェック
  const rateLimitResult = await RateLimiter.checkCombined(ip, ownerKey, 'post:create');
  if (!rateLimitResult.allowed) {
    await AuditLogger.logRateLimitExceeded(ownerKey, 'post:create', ip);
    const waitMinutes = Math.ceil((rateLimitResult.retryAfter || 0) / 60);
    return NextResponse.json(
      { 
        ok: false, 
        error: `投稿制限に達しました。5分間で最大3件までの投稿が可能です。`,
        message: `あと${waitMinutes}分後に再度投稿できます。`,
        retryAfter: rateLimitResult.retryAfter,
      },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult)
      }
    );
  }
  
  const form = await req.formData();
  const url = form.get("url") as string | null;
  const titleManual = (form.get("title") as string | null) || undefined;
  const comment = (form.get("comment") as string | null) || undefined;
  const handle = (form.get("handle") as string | null) || undefined;
  const tagsRaw = (form.getAll("tags") as string[]).filter(Boolean);

  // NGワードチェック（強化版）
  const ngCheck = NGWordFilterV2.check(titleManual || '', {
    checkTitle: true,
  });
  const handleCheck = NGWordFilterV2.check(handle || '', {
    checkHandle: true,
  });
  const commentCheck = NGWordFilterV2.check(comment || '', {
    checkComment: true,
  });
  
  // いずれかでブロック対象が検出された場合
  const combinedCheck = [
    ngCheck,
    handleCheck,
    commentCheck,
  ].find(check => check.isBlocked);
  
  if (combinedCheck) {
    await AuditLogger.logNGWordDetection(
      ownerKey,
      ip,
      combinedCheck.detectedWords,
      [titleManual || '', handle || '', comment || ''].join(' ')
    );
    
    // 理由に応じたエラーメッセージ
    let errorMessage = '投稿に不適切な内容が含まれています';
    if (combinedCheck.blockedLanguages.length > 0) {
      errorMessage = `${combinedCheck.blockedLanguages.join('・')}の使用は禁止されています`;
    } else if (combinedCheck.reason) {
      errorMessage = combinedCheck.reason;
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: errorMessage,
        detectedWords: combinedCheck.detectedWords.map(() => '[削除済]'),
        blockedLanguages: combinedCheck.blockedLanguages,
      },
      { status: 400 }
    );
  }
  
  // 警告レベルの検出（ログのみ）
  const warnings = [ngCheck, handleCheck, commentCheck]
    .filter(check => check.hasWarning)
    .flatMap(check => check.warningWords);
  
  if (warnings.length > 0) {
    await AuditLogger.log({
      action: AuditAction.POST_CREATE,
      severity: AuditSeverity.WARNING,
      userId: ownerKey,
      ipAddress: ip,
      details: { warningWords: warnings },
    });
  }
  
  let mediaType: "image" | "video" | undefined;
  let mediaUrl: string | undefined;

  const file = form.get("file") as File | null;
  if (file && file.size > 0) {
    // メディアアップロードのレート制限
    const mediaRateLimit = await RateLimiter.checkCombined(ip, ownerKey, 'media:upload');
    if (!mediaRateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many uploads. Please wait' },
        { status: 429, headers: getRateLimitHeaders(mediaRateLimit) }
      );
    }
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
      // マジックナンバー検証
      const input = Buffer.from(await file.arrayBuffer());
      const sig = await fileTypeFromBuffer(input).catch(()=>null);
      if (sig && !sig.mime.startsWith('image/')) {
        return new Response(JSON.stringify({ ok:false, error:'invalid-image' }), { status:415, headers:{'content-type':'application/json'} });
      }
      // サーバー側で最終再圧縮（1600px以内, JPEG80, メタデータ除去）
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

    // Save media to disk (temporarily until we migrate to R2)
    const mediaDir = path.join(process.cwd(), '.data', 'media');
    try { fs.mkdirSync(mediaDir, { recursive: true }); } catch {}
    const mediaPath = path.join(mediaDir, id);
    fs.writeFileSync(mediaPath, outBuffer);
    
    // For now, we'll store the media URL as a local path
    mediaUrl = `/api/posts/media/${id}`;
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
    tags = autoTags({ url: url || undefined, mediaType, comment });
  }

  try {
    const post = await postsRepo.createPost({
      title,
      url: url || undefined,
      comment,
      handle,
      ownerKey,
      tags,
      media: mediaType && mediaUrl ? { type: mediaType, url: mediaUrl } : undefined,
    });
    
    // 監査ログ記録
    await AuditLogger.logPostCreate(post.id, ownerKey, ip, {
      hasMedia: !!mediaType,
      hasUrl: !!url,
      tagCount: tags?.length || 0,
    });
    
    return NextResponse.json(
      { ok: true, post },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to create post' }), { 
      status: 500,
      headers: { "content-type": "application/json" } 
    });
  }
}