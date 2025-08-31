"use client";
import { useEffect, useRef, useState } from 'react';

function toEmbed(u: string): string | null {
  try {
    const url = new URL(u.replace('http://', 'https://'));
    if (!/note\.com$/i.test(url.hostname)) return null;
    // /@user/n/<id> | /user/n/<id> | /notes/<id>
    const m = url.pathname.match(/\/(?:@?[^/]+\/n|notes)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    return `https://note.com/embed/notes/${m[1]}`;
  } catch { return null; }
}

export default function NoteEmbedCard({ url }: { url: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState<{ title?: string | null; image?: string | null }>();
  useEffect(() => {
    const el = host.current; if (!el) return;
    (async () => {
      const src = toEmbed(url); if (!src) { setFailed(true); return; }
      try {
        const ce = await fetch(`/api/can-embed?url=${encodeURIComponent(src)}`).then(r => r.json());
        if (!ce?.ok || ce.canEmbed === false) {
          setFailed(true);
          const lp = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`).then(r => r.json()).catch(() => null);
          if (lp?.ok) setPreview({ title: lp.title, image: lp.image });
          return;
        }
      } catch { setFailed(true); return; }
      const ifr = document.createElement('iframe');
      ifr.src = src;
      ifr.referrerPolicy = 'origin-when-cross-origin';
      ifr.allow = 'clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen';
      ifr.setAttribute('allowfullscreen', 'true');
      ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
      ifr.style.width = '100%'; ifr.style.minHeight = '600px'; ifr.style.border = '0';
      el.replaceChildren(ifr);
    })().catch(() => setFailed(true));
  }, [url]);
  if (failed) return (
    <div className="note-embed">
      {preview?.image ? <img src={preview.image} alt="プレビュー" style={{ maxWidth: '100%', borderRadius: 8 }} /> : null}
      {preview?.title ? <p className="comment" style={{ fontWeight: 700, marginTop: 6 }}>{preview.title}</p> : null}
      <p style={{ margin: 0 }}>プレビューのみ。<a href={url} target="_blank" rel="noopener noreferrer">noteで見る</a></p>
    </div>
  );
  return <div ref={host} className="note-embed" />;
}

