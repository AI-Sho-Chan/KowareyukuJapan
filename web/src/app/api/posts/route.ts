import { NextRequest } from "next/server";
import { fetchMeta } from "@/lib/metadata";
import { mediaStore, postsStore, StoredPost, persistPostsToDisk, saveMediaToDisk } from "@/lib/store";

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
    if (/(\.mp4|\.webm|\.mov)$/.test(ext)) mediaType = "video";
    else mediaType = "image";
    const id = Math.random().toString(36).slice(2, 10);
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);
    // ディスクへ永続化＋メモリにも保持
    saveMediaToDisk(id, file.type || (mediaType === "video" ? "video/mp4" : "image/png"), ownerKey, buf);
    mediaStore.set(id, { contentType: file.type || (mediaType === "video" ? "video/mp4" : "image/png"), data: buf, ownerKey });
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


