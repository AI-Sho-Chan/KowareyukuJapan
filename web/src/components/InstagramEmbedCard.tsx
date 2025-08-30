"use client";

import { useEffect, useRef, useState } from 'react';
import { normalizeInstagramUrl } from '@/lib/instagram';

const MODE_KEY = 'data-ig-embed-mode';
const WAIT_MS = 5000;

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
  const [probe, setProbe] = useState<{ unavailable?: boolean; blocked?: boolean; status?: number } | null>(null);

  useEffect(() => {
    const el = host.current; if (!el) return;
    el.removeAttribute(MODE_KEY); setFailed(false);

    (async () => {
      const embedUrl = toEmbed(url); if (!embedUrl) { setFailed(true); return; }

      // Instagram 専用プローブ（参考情報として取得。ここでは失敗確定にしない）
      try {
        const cacheKey = `ig-probe-cache:${embedUrl}`;
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
          if (cached && Date.now() - (cached.ts as number) < 10*60*1000) {
            setProbe(cached.data || null);
          }
        } catch {}
        const pr = await fetch(`/api/instagram/probe?url=${encodeURIComponent(url)}`, { cache: 'no-store' }).then(r=>r.json());
        if (!pr?.ok) {
          setProbe({ unavailable: !!pr?.unavailable, blocked: !!pr?.blocked, status: pr?.status });
          try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: { unavailable: !!pr?.unavailable, blocked: !!pr?.blocked, status: pr?.status } })); } catch {}
        }
      } catch { /* ignore */ }

      // 公式ウィジェットをまず試す
      el.replaceChildren();
      // プレースホルダー高さ（公式埋め込みの高さ決定までの潰れ防止）
      el.style.minHeight = '360px';
      const bq = document.createElement('blockquote');
      bq.className = 'instagram-media';
      bq.setAttribute('data-instgrm-permalink', normalizeInstagramUrl(url));
      bq.setAttribute('data-instgrm-version', '14');
      bq.setAttribute('data-instgrm-captioned', '');
      // 一部環境で <a> が無いと描画されないため、明示的に追加
      const a = document.createElement('a');
      a.href = normalizeInstagramUrl(url);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'View on Instagram';
      bq.appendChild(a);
      el.appendChild(bq);

      const okScript = await ensureScript();
      if (okScript) {
        try {
          (window as any).instgrm.Embeds.process();
          const ok = await new Promise<boolean>((r) => {
            const t = setTimeout(() => r(false), WAIT_MS);
            const iv = setInterval(() => {
              if (el.querySelector('iframe')) { clearTimeout(t); clearInterval(iv); r(true); }
            }, 150);
          });
          if (ok) { el.setAttribute(MODE_KEY, 'official'); el.style.minHeight = ''; return; }
        } catch {}
      }

      // IFRAME フォールバック
      const ifr = document.createElement('iframe');
      ifr.src = embedUrl;
      ifr.referrerPolicy = 'origin-when-cross-origin';
      ifr.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
      ifr.setAttribute('allowfullscreen', 'true');
      ifr.sandbox = (process.env.NEXT_PUBLIC_RELAX_IG_SANDBOX === '1')
        ? 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation allow-storage-access-by-user-activation'
        : 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      ifr.style.width = '100%'; ifr.style.maxWidth = '540px'; ifr.style.minHeight = '300px'; ifr.style.border = '0';
      el.replaceChildren(ifr);
      el.setAttribute(MODE_KEY, 'iframe');
      el.style.minHeight = '';
    })().catch(() => setFailed(true));
  }, [url]);

  if (failed) {
    return <div className="instagram-embed">
      <p style={{ margin: 0 }}>
        投稿が年齢・地域制限、またはログイン制限等のため、サイト内で表示できません。
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6 }}>Instagramで見る</a>
      </p>
    </div>;
  }
  return <div ref={host} className="instagram-embed" />;
}
