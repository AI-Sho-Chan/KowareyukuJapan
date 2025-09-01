import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

export type UploadCheck = {
  ok: boolean;
  error?: string;
  normalizedType?: 'image'|'video';
  contentType?: string;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB

const ADULT_HINT = [/sex/i, /porn/i, /hentai/i, /nude/i, /ero/i, /adult/i, /18\+?/i];

export async function guardUpload(buf: Buffer, declaredType: string, fileName?: string): Promise<UploadCheck> {
  const size = buf?.length || 0;
  const ft = await fileTypeFromBuffer(buf).catch(() => undefined);
  const ct = (ft?.mime || declaredType || '').toLowerCase();
  const name = fileName || '';

  // Reject adult hint by filename
  if (ADULT_HINT.some(r => r.test(name))) {
    return { ok: false, error: '成人向けコンテンツの疑いがあるためアップロードできません' };
  }

  if (ct.startsWith('image/')) {
    if (size > MAX_IMAGE_BYTES) return { ok: false, error: '画像サイズが大きすぎます (最大10MB)' };
    try {
      const meta = await sharp(buf).metadata();
      if ((meta.width || 0) > 8000 || (meta.height || 0) > 8000) {
        return { ok: false, error: '解像度が高すぎます (最大8000px)' };
      }
    } catch { /* ignore */ }
    return { ok: true, normalizedType: 'image', contentType: ct };
  }

  if (ct.startsWith('video/')) {
    if (size > MAX_VIDEO_BYTES) return { ok: false, error: '動画サイズが大きすぎます (最大200MB)' };
    // 形式はMP4/WebMを推奨（他は拒否）
    if (!(ct.includes('mp4') || ct.includes('webm'))) {
      return { ok: false, error: '動画形式は MP4 または WebM のみ許可されています' };
    }
    return { ok: true, normalizedType: 'video', contentType: ct };
  }

  return { ok: false, error: '許可されていないファイル種別です' };
}

