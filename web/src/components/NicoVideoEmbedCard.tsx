"use client";
import { useEffect, useRef, useState } from 'react';

function toEmbed(u: string): string | null {
  try{
    const url = new URL(u);
    // https://www.nicovideo.jp/watch/sm<id> → https://embed.nicovideo.jp/watch/sm<id>
    const m = url.pathname.match(/\/watch\/(sm\d+|so\d+|nm\d+)/i);
    if (!m) return null;
    return `https://embed.nicovideo.jp/watch/${m[1]}`;
  }catch{ return null; }
}

export default function NicoVideoEmbedCard({ url }: { url: string }){
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState<string>('');
  useEffect(()=>{
    const el = host.current; if(!el) return;
    (async()=>{
      const src = toEmbed(url); if (!src) { setFailed(true); return; }
      try {
        const ce = await fetch(`/api/can-embed?url=${encodeURIComponent(src)}`).then(r=>r.json());
        if (!ce?.ok || ce.canEmbed === false) { setFailed(true); setReason('埋め込み不可（X-Frame-Options/CSP）'); return; }
      } catch { setFailed(true); return; }
      const ifr = document.createElement('iframe');
      ifr.src = src;
      ifr.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
      ifr.setAttribute('allowfullscreen','true');
      ifr.referrerPolicy = 'origin-when-cross-origin';
      ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      ifr.style.width='100%'; ifr.style.minHeight='400px'; ifr.style.border='0';
      el.replaceChildren(ifr);
    })().catch(()=>setFailed(true));
  },[url]);
  if (failed) return <div className="niconico-embed"><p style={{margin:0}}>プレビューのみ（{reason||'サイト側の制限'}）。<a href={url} target="_blank" rel="noopener noreferrer">ニコニコで見る</a></p></div>;
  return <div ref={host} className="niconico-embed"/>;
}


