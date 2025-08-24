import { NextRequest } from "next/server";
import { fetchMeta } from "@/lib/metadata";
import { mediaStore, postsStore, StoredPost, persistPostsToDisk } from "@/lib/store";

type Post = {
  id: string;
  url?: string;
  media?: { type: "image" | "video"; name: string };
  title: string;
  comment?: string;
  handle?: string;
  createdAt: number;
  ownerKey: string; // 簡易: 端末匿名ID
};

function getOwnerKey(req: NextRequest): string {
  const key = req.headers.get("x-client-key") || "anon";
  return key;
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
    mediaStore.set(id, { contentType: file.type || (mediaType === "video" ? "video/mp4" : "image/png"), data: Buffer.from(ab), ownerKey });
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
  // X/Twitterはクライアント側でタイトル自動生成。サーバ保存では空のまま維持
  if (!titleManual && isX) {
    if (!title || /javascript is not available\.?/i.test(title)) {
      title = "";
    }
  }
  // ファイルのみ投稿でタイトル未指定→種類別の既定タイトル
  if (!title && !url && mediaType) {
    title = mediaType === "image" ? "画像（ユーザー投稿）" : "動画（ユーザー投稿）";
  }
  // それ以外のみデフォルト"(無題)"
  if (!title && !isX) title = "(無題)";

  const id = Math.random().toString(36).slice(2, 10);
  const post: StoredPost = {
    id,
    url: url || undefined,
    media: mediaType && mediaId ? { type: mediaType, id: mediaId, url: `/api/posts/media/${mediaId}` } : undefined,
    title,
    comment,
    handle,
    createdAt: Date.now(),
    ownerKey,
  };
  postsStore.push(post);
  persistPostsToDisk();
  return new Response(JSON.stringify({ ok: true, post }), { headers: { "content-type": "application/json" } });
}


