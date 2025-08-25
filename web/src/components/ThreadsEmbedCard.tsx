"use client";
import { useEffect, useRef, useState } from 'react';

function toEmbed(u: string): string | null {
  try{
    const url = new URL(u.replace('http://','https://'));
    // 例: https://www.threads.net/@user/post/<id>
    if (!/threads\.net/.test(url.hostname)) return null;
    return url.toString();
  }catch{ return null; }
}

export default function ThreadsEmbedCard({ url }: { url: string }){
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(()=>{
    const el = host.current; if(!el) return;
    (async()=>{
      const embed = toEmbed(url); if(!embed){ setFailed(true); return; }
      // 1) 公式 IFRAME ウィジェット
      const ifr = document.createElement('iframe');
      ifr.src = embed;
      ifr.referrerPolicy = 'origin-when-cross-origin';
      ifr.allow = 'clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
      ifr.setAttribute('allowfullscreen','true');
      ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      ifr.style.width='100%'; ifr.style.minHeight='400px'; ifr.style.border='0';
      el.replaceChildren(ifr);
    })().catch(()=>setFailed(true));
  },[url]);
  if (failed) {
    return <div className="threads-embed"><p style={{margin:0}}>プレビューのみ。<a href={url} target="_blank" rel="noopener noreferrer">Threadsで見る</a></p></div>;
  }
  return <div ref={host} className="threads-embed"/>;
}


