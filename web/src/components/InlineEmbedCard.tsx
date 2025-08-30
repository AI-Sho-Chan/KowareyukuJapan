"use client";

import { useCallback, useMemo, useState } from "react";
import InstagramEmbedCard from "@/components/InstagramEmbedCard";

type Props = {
  postId: string;
  title: string;
  comment: string;
  tags: string[];
  sourceUrl: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  kind: "youtube" | "page" | "image" | "video";
  autoOpen?: boolean;
  alwaysOpen?: boolean;
  showSourceLink?: boolean;
  createdAt?: number;
  handle?: string;
  ownerKey?: string;
  adminHeader?: React.ReactNode;
  footerExtras?: React.ReactNode;
};

function onceGuard(key: string): boolean {
  const k = `kj_once_${key}`;
  if (typeof window === "undefined") return true;
  if (localStorage.getItem(k)) return false;
  localStorage.setItem(k, "1");
  return true;
}

function formatHandle(h?: string): string {
  const t = (h || "").trim();
  if (!t) return "@guest";
  return t.startsWith("@") ? t : `@${t}`;
}

function formatDateTime(ts?: number): string {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString("ja-JP"); } catch { return ""; }
}

export default function InlineEmbedCard({
  postId,
  title,
  comment,
  tags,
  sourceUrl,
  thumbnailUrl,
  embedUrl,
  kind,
  autoOpen,
  alwaysOpen,
  showSourceLink = true,
  createdAt,
  handle,
  ownerKey,
  adminHeader,
  footerExtras,
}: Props) {
  const [open, setOpen] = useState<boolean>(!!autoOpen || !!alwaysOpen);
  const [count, setCount] = useState<number>(0);

  const resolvedEmbedUrl = useMemo(() => {
    if (kind === "youtube") {
      const u = embedUrl || sourceUrl;
      try {
        const url = new URL(u);
        let id = '';
        if (url.hostname.includes('youtu.be')) id = url.pathname.replace(/^\//, '');
        else id = url.searchParams.get('v') || '';
        if (id) return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
      } catch {}
      return u;
    }
    try {
      const u = embedUrl || sourceUrl;
      const url = new URL(u);
      if (url.hostname.toLowerCase().includes('instagram.com')) {
        const m = url.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_\-]+)/);
        if (m) return `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned`;
      }
    } catch {}
    return embedUrl || sourceUrl;
  }, [embedUrl, sourceUrl, kind]);

  const isInstagramPage = useMemo(() => {
    try { return new URL(sourceUrl).hostname.toLowerCase().includes('instagram.com'); } catch { return false; }
  }, [sourceUrl]);

  const frameAllowedForPage = useMemo(() => {
    if (kind !== 'page') return true;
    try {
      const h = new URL(sourceUrl).hostname.toLowerCase();
      const blockHosts = ['news.yahoo.co.jp','yahoo.co.jp','yahoo.com','www3.nhk.or.jp','www.asahi.com','mainichi.jp','www.yomiuri.co.jp'];
      if (blockHosts.some(b => h === b || h.endsWith('.' + b))) return false;
      const allowHosts = new Set(['platform.twitter.com','www.youtube.com','www.youtube-nocookie.com','www.instagram.com','www.tiktok.com','www.threads.net','embed.nicovideo.jp','note.com']);
      return allowHosts.has(h);
    } catch { return false; }
  }, [kind, sourceUrl]);

  const onShare = useCallback(async () => {
    try {
      if (navigator.share) await navigator.share({ title, url: sourceUrl });
      else { await navigator.clipboard.writeText(sourceUrl); alert('URLをコピーしました'); }
    } catch {}
  }, [title, sourceUrl]);

  const onEmpathize = useCallback(() => {
    if (!onceGuard(`empathize_${postId}`)) { alert('この投稿には既に共感済みです'); return; }
    setCount((v) => v + 1);
  }, [postId]);

  return (
    <article className="card" data-post-id={postId}>
      {!alwaysOpen && (
        <button className="media" type="button" aria-label="埋め込みを開く" onClick={() => setOpen((v) => !v)}>
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="プレビュー" loading="lazy" />
          ) : (
            <div style={{ height: 8 }} />
          )}
        </button>
      )}
      <div className="card-body">
        {adminHeader}
        <h2 className="title">{title}</h2>
        <div className="embed" aria-hidden={!(alwaysOpen || open)} style={{ marginTop: 8, display: (alwaysOpen || open) ? 'block' : 'none', overflowX: 'hidden' }}>
          {kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolvedEmbedUrl} alt="拡大画像" loading="lazy" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)' }} />
          ) : kind === 'video' ? (
            <video preload="metadata" src={resolvedEmbedUrl} controls playsInline style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)' }} />
          ) : isInstagramPage ? (
            <InstagramEmbedCard url={sourceUrl} />
          ) : frameAllowedForPage ? (
            <iframe src={resolvedEmbedUrl} width="100%" height={kind === 'youtube' ? 315 : 600} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="origin-when-cross-origin" allowFullScreen style={{ border: '1px solid var(--line)', borderRadius: 12, background: '#fff' }} />
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: '#fff', padding: 12 }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>このサイトは埋め込み表示に対応していません。</p>
              <p style={{ marginTop: 8 }}><a className="btn source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">引用先を開く</a></p>
            </div>
          )}
        </div>
        <div className="meta" style={{ marginTop: 8 }}>
          <span className="handle">投稿者：{formatHandle(handle)}</span>
          <span className="tags">{tags.map((t) => `#${t}`).join('・')}</span>
          {createdAt ? <time style={{ marginLeft: 8 }}>{formatDateTime(createdAt)}</time> : null}
        </div>
        <div className="comment-label">投稿者のコメント</div>
        <p className="comment">{comment || '(コメントなし)'}</p>
        <div className="actions">
          <button className="btn primary" onClick={onEmpathize}>共感する <span className="count">{count}</span></button>
          <button className="btn" onClick={onShare}>シェア</button>
          {showSourceLink && <a className="btn source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">引用先</a>}
        </div>
        {footerExtras}
      </div>
    </article>
  );
}

