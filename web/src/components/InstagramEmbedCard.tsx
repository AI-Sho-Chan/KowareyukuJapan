"use client";
import { useEffect, useRef, useState } from 'react';

const MODE_KEY = 'data-ig-embed-mode';

function toEmbed(u: string): string | null {
  try {
    const url = new URL(u);
    const m = url.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_\-]+)/);
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned` : null;
  } catch { return null; }
}

function ensureScript(): Promise<boolean> {
  return new Promise((res) => {
    const w: any = window;
    if (w.instgrm?.Embeds?.process) return res(true);
    const s = document.createElement('script');
    s.src = 'https://www.instagram.com/embed.js';
    s.async = true;
    s.onload = () => res(!!w.instgrm?.Embeds?.process);
    s.onerror = () => res(false);
    document.head.appendChild(s);
  });
}

export default function InstagramEmbedCard({ url }: { postId?: string; url: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current; if (!el) return;
    el.removeAttribute(MODE_KEY); setFailed(false);

    (async () => {
      const embedUrl = toEmbed(url); if (!embedUrl) { setFailed(true); return; }

      try {
        const ce = await fetch(`/api/can-embed?url=${encodeURIComponent(embedUrl)}`).then(r => r.json());
        if (!ce?.ok || ce.canEmbed === false) { setFailed(true); return; }
      } catch {}

      el.replaceChildren();
      const bq = document.createElement('blockquote');
      bq.className = 'instagram-media';
      bq.setAttribute('data-instgrm-permalink', url);
      bq.setAttribute('data-instgrm-version', '14');
      bq.setAttribute('data-instgrm-captioned', '');
      el.appendChild(bq);

      const okScript = await ensureScript();
      if (okScript) {
        try {
          (window as any).instgrm.Embeds.process();
          const ok = await new Promise<boolean>((r) => {
            const t = setTimeout(() => r(false), 3500);
            const iv = setInterval(() => {
              if (el.querySelector('iframe')) { clearTimeout(t); clearInterval(iv); r(true); }
            }, 120);
          });
          if (ok) { el.setAttribute(MODE_KEY, 'official'); return; }
        } catch {}
      }

      const ifr = document.createElement('iframe');
      ifr.src = embedUrl;
      ifr.referrerPolicy = 'origin-when-cross-origin';
      ifr.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
      ifr.setAttribute('allowfullscreen', 'true');
      ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      ifr.style.width = '100%'; ifr.style.maxWidth = '540px'; ifr.style.minHeight = '300px'; ifr.style.border = '0';
      el.replaceChildren(ifr);
      el.setAttribute(MODE_KEY, 'iframe');
    })().catch(() => setFailed(true));
  }, [url]);

  if (failed) {
    return <div className="instagram-embed">
      <p style={{ margin: 0 }}>プレビューのみ。<a href={url} target="_blank" rel="noopener noreferrer">Instagramで見る</a></p>
    </div>;
  }
  return <div ref={host} className="instagram-embed" />;
}
