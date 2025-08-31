"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import InstagramEmbedCard from "@/components/InstagramEmbedCard";
import NoteEmbedCard from "@/components/NoteEmbedCard";
import { useEventTracking } from "@/hooks/useEventTracking";

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
  const { trackView, trackEmpathy, trackShare, getStats } = useEventTracking(postId);

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

  const isNotePage = useMemo(() => {
    try { return new URL(sourceUrl).hostname.toLowerCase().includes('note.com'); } catch { return false; }
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
      const t = title || (comment || '').split('\n')[0] || '';
      if (navigator.share) await navigator.share({ title: t, url: sourceUrl });
      else { await navigator.clipboard.writeText(sourceUrl); alert('URL copied'); }
      try { await trackShare(postId); } catch {}
    } catch {}
  }, [title, comment, sourceUrl, trackShare, postId]);

  const onEmpathize = useCallback(async () => {
    if (!onceGuard(`empathize_${postId}`)) { alert('Already empathized'); return; }
    setCount((v) => v + 1);
    try { const s = await trackEmpathy(postId); if (s?.empathies != null) setCount(Number(s.empathies)); } catch {}
  }, [postId, trackEmpathy]);

  useEffect(() => {
    (async () => {
      try { await trackView(postId); } catch {}
      try { const s = await getStats(postId); if (s?.empathies != null) setCount(Number(s.empathies)); } catch {}
    })();
  }, [postId, trackView, getStats]);

  return (
    <article className="card" data-post-id={postId}>
      {!alwaysOpen && (
        <button className="media" type="button" aria-label="toggle-embed" onClick={() => setOpen((v) => !v)}>
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="preview" loading="lazy" />
          ) : (
            <div style={{ height: 8 }} />
          )}
        </button>
      )}
      <div className="card-body">
        {adminHeader}
        <h2 className="title">{title || (comment?.split('\n')?.[0] || '')}</h2>
        <div className="embed" aria-hidden={!(alwaysOpen || open)} style={{ marginTop: 8, display: (alwaysOpen || open) ? 'block' : 'none', overflowX: 'hidden' }}>
          {isNotePage ? (
            <NoteEmbedCard url={sourceUrl} />
          ) : kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolvedEmbedUrl} alt="image" loading="lazy" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)' }} />
          ) : kind === 'video' ? (
            <video preload="metadata" src={resolvedEmbedUrl} controls playsInline style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)' }} />
          ) : isInstagramPage ? (
            <InstagramEmbedCard url={sourceUrl} />
          ) : frameAllowedForPage ? (
            <iframe src={resolvedEmbedUrl} width="100%" height={kind === 'youtube' ? 315 : 600} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="origin-when-cross-origin" allowFullScreen style={{ border: '1px solid var(--line)', borderRadius: 12, background: '#fff' }} />
          ) : (
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, background: '#fff', padding: 12 }}>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Embed not supported. Open source link:</p>
              <p style={{ marginTop: 8 }}><a className="btn source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">Open source</a></p>
            </div>
          )}
        </div>
        <div className="meta" style={{ marginTop: 8 }}>
          <span className="handle">by {formatHandle(handle)}</span>
          <span className="tags">{tags.map((t) => `#${t}`).join('·')}</span>
          {createdAt ? <time style={{ marginLeft: 8 }}>{formatDateTime(createdAt)}</time> : null}
        </div>
        <div className="comment-label">Comment</div>
        <p className="comment">{comment || '(no comment)'}</p>
        <div className="actions">
          <button className="btn primary" onClick={onEmpathize}>Empathize <span className="count">{count}</span></button>
          <button className="btn" onClick={onShare}>Share</button>
          {showSourceLink && <a className="btn source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>}
        </div>
        {footerExtras}
      </div>
    </article>
  );
}
