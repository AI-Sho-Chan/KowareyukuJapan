"use client";

import { useEffect, useRef } from "react";
import { toYTEmbed } from "./youtube";

type Props = { postId: string; url: string; title?: string; comment?: string; handle?: string };

function formatHandle(h?: string){
  const t = (h || "").trim();
  if (!t) return "@guest";
  return t.startsWith("@") ? t : `@${t}`;
}

export default function YouTubeEmbedCard({ postId, url, title = "YouTube", comment, handle }: Props){
  const box = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const e = toYTEmbed(url); if (!e || !box.current) return;
    const ifr = document.createElement('iframe');
    ifr.src = e.src;
    ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
    ifr.setAttribute('allowfullscreen','true');
    ifr.referrerPolicy = 'origin-when-cross-origin';
    ifr.loading = 'lazy';
    ifr.style.border = '0';
    const wrap = document.createElement('div');
    wrap.className = 'embed-16by9';
    wrap.appendChild(ifr);
    box.current.replaceChildren(wrap);
  },[url]);
  return (
    <article className="card" data-post-id={postId}>
      <div className="card-body">
        <h2 className="title">{title}</h2>
        <div className="meta"><span className="handle">記録者：{formatHandle(handle)}</span></div>
        <div className="comment-label">記録者のコメント</div>
        <p className="comment">{comment || "(コメントなし)"}</p>
        <div ref={box} className="youtube-card" style={{marginTop:8}} />
      </div>
    </article>
  );
}
