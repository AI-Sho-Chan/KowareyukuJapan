"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useEventTracking } from "@/hooks/useEventTracking";

type Props = {
  postId: string;
  title?: string;
  comment: string;
  statusUrl: string;
  handle?: string;
  tags?: string[];
  createdAt?: number;
  adminHeader?: React.ReactNode;
  footerExtras?: React.ReactNode;
};

function getTweetId(u: string) {
  try {
    const m = new URL(u).pathname.match(/status(?:es)?\/(\d{5,})/);
    return m ? m[1] : "";
  } catch { return ""; }
}

function toTwitter(u: string){
  try {
    return new URL(u).href.replace(/^https?:\/\/x\.com\//i, 'https://twitter.com/');
  } catch { return u; }
}

function formatHandle(h?: string): string {
  const t = (h || "").trim();
  return t ? (t.startsWith("@") ? t : `@${t}`) : "@guest";
}
function formatDateTime(ts?: number): string { if (!ts) return ""; try { return new Date(ts).toLocaleString("ja-JP"); } catch { return ""; } }

export default function XEmbedCard({ postId, title = "", comment, statusUrl, handle, tags, createdAt, adminHeader, footerExtras }: Props) {
  const { trackView } = useEventTracking(postId);
  const tweetUrl = useMemo(() => toTwitter(statusUrl), [statusUrl]);
  const blockRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { (async () => { try { await trackView(postId); } catch {} })(); }, [postId, trackView]);

  // Load Twitter widgets.js and render blockquote
  useEffect(() => {
    const el = blockRef.current; if (!el) return;
    // Create blockquote
    el.innerHTML = '';
    const bq = document.createElement('blockquote');
    bq.className = 'twitter-tweet';
    const a = document.createElement('a'); a.href = tweetUrl; bq.appendChild(a);
    el.appendChild(bq);
    function load(){
      // @ts-ignore
      const tw = (window as any).twttr;
      if (tw && tw.widgets && typeof tw.widgets.load === 'function') { try { tw.widgets.load(el); setReady(true); } catch {} return; }
      const existed = document.querySelector('script[src^="https://platform.twitter.com/widgets.js"]');
      if (existed) { existed.addEventListener('load', ()=>{ try { (window as any).twttr?.widgets?.load(el); setReady(true);} catch {} }, { once:true }); return; }
      const s = document.createElement('script'); s.async = true; s.src = 'https://platform.twitter.com/widgets.js'; s.charset = 'utf-8';
      s.onload = ()=>{ try { (window as any).twttr?.widgets?.load(el); setReady(true);} catch {} };
      document.body.appendChild(s);
    }
    load();
  }, [tweetUrl]);

  const computedTitle = title || (comment || "").split("\n")[0] || "X / Twitter";

  return (
    <article className="card twitter-card" data-post-id={postId}>
      <div className="card-body">
        {adminHeader}
        <h2 className="title">{computedTitle}</h2>
        <div className="embed" style={{ marginTop: 8 }}>
          <div ref={blockRef} />
          {!ready && <a href={statusUrl} target="_blank" rel="noopener noreferrer">Xで開く</a>}
        </div>
        <div className="meta" style={{ marginTop: 8 }}>
          <span className="handle">記録者 {formatHandle(handle)}</span>
          {Array.isArray(tags) && tags.length ? (<span className="tags">{tags.map(t => `#${t}`).join("・")}</span>) : null}
          {createdAt ? <time style={{ marginLeft: 8 }}>{formatDateTime(createdAt)}</time> : null}
        </div>
        <div className="comment-label">コメント</div>
        <p className="comment">{comment || "(コメントなし)"}</p>
        <div className="actions" style={{ marginTop: 8 }}>
          <a className="btn" href={statusUrl} target="_blank" rel="noopener noreferrer">シェア</a>
          <a className="btn source-link" href={statusUrl} target="_blank" rel="noopener noreferrer">ソース</a>
        </div>
        {footerExtras}
      </div>
    </article>
  );
}
