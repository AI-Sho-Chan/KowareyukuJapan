"use client";
import { useEffect, useRef } from 'react';
import { toYTEmbed } from '@/lib/youtube';

export default function YouTubeEmbedCard({ url }: { url: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const e = toYTEmbed(url); if (!e || !host.current) return;
    const wrap = document.createElement('div');
    wrap.className = 'embed-16by9';
    const ifr = document.createElement('iframe');
    ifr.src = e.src;
    ifr.allow = 'fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    ifr.referrerPolicy = 'origin-when-cross-origin';
    ifr.loading = 'lazy';
    ifr.style.border = '0';
    wrap.appendChild(ifr);
    host.current.replaceChildren(wrap);
  }, [url]);
  return <div ref={host} className="youtube-card" />;
}
