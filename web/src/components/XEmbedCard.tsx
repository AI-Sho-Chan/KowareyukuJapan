"use client";

import { useEffect, useMemo } from "react";
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

function formatHandle(h?: string): string {
  const t = (h || "").trim();
  return t ? (t.startsWith("@") ? t : `@${t}`) : "@guest";
}
function formatDateTime(ts?: number): string { if (!ts) return ""; try { return new Date(ts).toLocaleString("ja-JP"); } catch { return ""; } }

export default function XEmbedCard({ postId, title = "", comment, statusUrl, handle, tags, createdAt, adminHeader, footerExtras }: Props) {
  const { trackView } = useEventTracking(postId);
  const embedSrc = useMemo(() => {
    const id = getTweetId(statusUrl);
    if (!id) return "";
    return `https://platform.twitter.com/embed/Tweet.html?id=${id}&dnt=1&hide_thread=1&lang=ja`;
  }, [statusUrl]);

  useEffect(() => { (async () => { try { await trackView(postId); } catch {} })(); }, [postId, trackView]);

  const computedTitle = title || (comment || "").split("\n")[0] || "X / Twitter";

  return (
    <article className="card twitter-card" data-post-id={postId}>
      <div className="card-body">
        {adminHeader}
        <h2 className="title">{computedTitle}</h2>
        <div className="embed" style={{ marginTop: 8 }}>
          {embedSrc ? (
            <iframe src={embedSrc} width="100%" height={360} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" style={{ border: "0", borderRadius: 12 }} />
          ) : (
            <a href={statusUrl} target="_blank" rel="noopener noreferrer">Xで開く</a>
          )}
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

