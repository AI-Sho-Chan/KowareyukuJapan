"use client";
import { useEffect, useRef, useState } from 'react';

function toEmbed(u: string): string | null {
  try {
    const url = new URL(u);
    // https://www.tiktok.com/@user/video/<id>
    const m = url.pathname.match(/\/video\/(\d+)/);
    if (m) return `https://www.tiktok.com/embed/v2/video/${m[1]}`;
    // すでに埋め込み形式
    if (/\/embed\//.test(url.pathname)) return url.toString();
    return null;
  } catch { return null; }
}

export default function TikTokEmbedCard({ url }: { url: string }){
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState<string>('');
  useEffect(()=>{
    const el = host.current; if(!el) return;
    (async()=>{
      const embed = toEmbed(url); if (!embed) { setFailed(true); return; }
      try {
        const ce = await fetch(`/api/can-embed?url=${encodeURIComponent(embed)}`).then(r=>r.json());
        if (!ce?.ok || ce.canEmbed === false) { setReason('埋め込み不可（X-Frame-Options/CSP）'); setFailed(true); return; }
      } catch { setFailed(true); return; }
      // 1) 公式 blockquote + embed.js
      el.replaceChildren();
      const bq = document.createElement('blockquote');
      bq.className = 'tiktok-embed';
      bq.setAttribute('cite', url);
      bq.setAttribute('data-video-id', embed.split('/').pop() || '');
      el.appendChild(bq);
      // ensure script
      const ensure = ()=> new Promise<boolean>(res=>{
        const w:any = window as any;
        if (w.tiktokEmbedLoaded) return res(true);
        const s = document.createElement('script');
        s.src = 'https://www.tiktok.com/embed.js'; s.async = true;
        s.onload = ()=> res(true); s.onerror = ()=> res(false);
        document.head.appendChild(s);
      });
      const ok = await ensure();
      if (ok) {
        // 少し待ってiframe化を確認
        const ok2 = await new Promise<boolean>(r=>{
          const t=setTimeout(()=>r(false), 5000);
          const iv=setInterval(()=>{ if (el.querySelector('iframe')){ clearInterval(iv); clearTimeout(t); r(true);} }, 150);
        });
        if (ok2) return;
      }
      // 2) 直IFRAME
      const ifr = document.createElement('iframe');
      ifr.src = embed;
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
      ifr.setAttribute('allowfullscreen','true');
      ifr.referrerPolicy = 'origin-when-cross-origin';
      ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      ifr.style.width='100%'; ifr.style.minHeight='600px'; ifr.style.border='0';
      el.replaceChildren(ifr);
    })().catch(()=>setFailed(true));
  },[url]);
  if (failed) return <div className="tiktok-embed"><p style={{margin:0}}>プレビューのみ（{reason||'サイト側の制限'}）。<a href={url} target="_blank" rel="noopener noreferrer">TikTokで見る</a></p></div>;
  return <div ref={host} className="tiktok-embed"/>;
}


