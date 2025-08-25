"use client";
import { useEffect, useRef, useState } from 'react';

function toEmbed(u: string): string | null {
  try{
    const url = new URL(u.replace('http://','https://'));
    if (!/note\.com$/.test(url.hostname)) return null;
    // note.com は /embed/notes/<id> を利用
    const m = url.pathname.match(/\/notes\/(\w+)/);
    if (!m) return null;
    return `https://note.com/embed/notes/${m[1]}`;
  }catch{ return null; }
}

export default function NoteEmbedCard({ url }: { url: string }){
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(()=>{
    const el = host.current; if(!el) return;
    (async()=>{
      const src = toEmbed(url); if(!src){ setFailed(true); return; }
      const ifr = document.createElement('iframe');
      ifr.src = src;
      ifr.referrerPolicy = 'origin-when-cross-origin';
      ifr.allow = 'clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
      ifr.setAttribute('allowfullscreen','true');
      ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      ifr.style.width='100%'; ifr.style.minHeight='600px'; ifr.style.border='0';
      el.replaceChildren(ifr);
    })().catch(()=>setFailed(true));
  },[url]);
  if (failed) return <div className="note-embed"><p style={{margin:0}}>プレビューのみ。<a href={url} target="_blank" rel="noopener noreferrer">noteで見る</a></p></div>;
  return <div ref={host} className="note-embed"/>;
}


