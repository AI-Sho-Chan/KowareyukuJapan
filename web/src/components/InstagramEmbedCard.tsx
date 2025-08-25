"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  postId: string;
  url: string;
  title?: string;
  comment?: string;
  handle?: string;
};

function formatHandle(h?: string){
  const t = (h || "").trim();
  if (!t) return "@guest";
  return t.startsWith("@") ? t : `@${t}`;
}

function igShortcode(u: string){
  try{
    const url = new URL(u);
    const m = url.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_\-]+)/);
    return m ? `${m[1]}/${m[2]}` : null;
  }catch{ return null; }
}
export function toIgEmbedUrl(u: string){
  const sc = igShortcode(u);
  return sc ? `https://www.instagram.com/${sc}/embed` : null;
}

export default function InstagramEmbedCard({ postId, url, title = "Instagram", comment, handle }: Props){
  const ref = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState<{text?:string; title?:string; image?:string}>();

  useEffect(()=>{
    const el = ref.current; if(!el) return;
    const embedUrl = toIgEmbedUrl(url);
    if (!embedUrl) { setFallback({ text: 'URL形式に未対応' }); return; }

    const MODE_KEY = 'data-ig-embed-mode';
    if (el.getAttribute(MODE_KEY)) return;

    const ensureScript = () => new Promise<void>(res => {
      const w:any = window as any;
      if (w.instgrm?.Embeds?.process) return res();
      const s = document.createElement('script');
      s.src = 'https://www.instagram.com/embed.js'; s.async = true;
      s.onload = () => res(); document.head.appendChild(s);
    });

    const fetchPreview = async()=>{
      try{
        const r = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
        const j = await r.json();
        const mt = j?.meta?.title as string|undefined;
        const img = j?.meta?.image as string|undefined;
        setFallback({ text: 'プレビューのみ。Instagramで見るをご利用ください。', title: mt, image: img });
      }catch{
        setFallback({ text: 'プレビューのみ。Instagramで見るをご利用ください。' });
      }
    };

    (async()=>{
      // can-embed を /embed URL で確認
      try{
        const ce = await fetch(`/api/can-embed?url=${encodeURIComponent(embedUrl)}`);
        const cj = await ce.json();
        if (!cj?.ok || cj?.canEmbed === false){ await fetchPreview(); return; }
      }catch{ await fetchPreview(); return; }

      // 1) 公式scriptで描画
      const bq = document.createElement('blockquote');
      bq.className = 'instagram-media';
      bq.setAttribute('data-instgrm-permalink', url);
      bq.setAttribute('data-instgrm-version', '14');
      el.replaceChildren(bq);
      try{
        await ensureScript();
        (window as any).instgrm.Embeds.process();
        const ok = await new Promise<boolean>(r=>{
          const t=setTimeout(()=>r(false),3500);
          const iv=setInterval(()=>{ if(el.querySelector('iframe')){clearInterval(iv);clearTimeout(t);r(true);} },120);
        });
        if (ok){ el.setAttribute(MODE_KEY,'official'); return; }
      }catch{}

      // 2) IFRAME直挿し
      try{
        const ifr = document.createElement('iframe');
        ifr.src = embedUrl;
        ifr.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
        ifr.setAttribute('allowfullscreen','true');
        ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
        ifr.style.width = '100%'; ifr.style.maxWidth = '540px'; ifr.style.minHeight = '300px'; ifr.style.border = '0';
        el.replaceChildren(ifr);
        el.setAttribute(MODE_KEY,'iframe');
        return;
      }catch{}

      // 3) プレビュー
      await fetchPreview();
    })();
  },[url]);

  return (
    <article className="card" data-post-id={postId}>
      <div className="card-body">
        <h2 className="title">{title}</h2>
        <div className="meta"><span className="handle">記録者：{formatHandle(handle)}</span></div>
        <div className="comment-label">記録者のコメント</div>
        <p className="comment">{comment || "(コメントなし)"}</p>
        <div ref={ref} className="instagram-card" style={{marginTop:8}} />
        {fallback ? (
          <div style={{border:'1px solid var(--line)',borderRadius:12,padding:10,marginTop:8}}>
            {fallback.title ? <p className="comment" style={{fontWeight:700}}>{fallback.title}</p> : null}
            {fallback.image ? (<img src={fallback.image} alt="プレビュー" style={{maxWidth:'100%',borderRadius:8}} />) : null}
            <p className="comment" style={{marginTop:8}}>{fallback.text}</p>
            <a className="btn" href={url} target="_blank" rel="noopener noreferrer" style={{marginTop:8,display:'inline-block'}}>Instagramで見る</a>
          </div>
        ) : null}
      </div>
    </article>
  );
}
