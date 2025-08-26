"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeIntroFromExtract } from '@/lib/extract';

type Props = {
  postId: string;
  title: string;
  comment: string;
  tags: string[];
  sourceUrl: string; // シェア/外部用URL
  thumbnailUrl?: string;
  embedUrl?: string; // iframe表示用URL（未指定時はsourceUrl）
  kind: "youtube" | "page" | "image" | "video";
  autoOpen?: boolean;
  alwaysOpen?: boolean;
  showSourceLink?: boolean;
  owner?: boolean;
  onDelete?: () => void;
  createdAt?: number;
  handle?: string;
  adminHeader?: React.ReactNode;
  footerExtras?: React.ReactNode;
};

function onceGuard(key: string): boolean {
  const k = `kj_once_${key}`;
  if (typeof localStorage === "undefined") return true;
  if (localStorage.getItem(k)) return false;
  localStorage.setItem(k, "1");
  return true;
}

function formatDateTime(ts?: number): string {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("ja-JP", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return "";
  }
}

function formatHandle(h?: string): string {
  const t = (h || "").trim();
  if (!t) return "@guest";
  return t.startsWith("@") ? t : `@${t}`;
}

// Preview utilities per spec
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ''; } };
const norm = (s: string = '') => s.toLowerCase().replace(/\s+/g,' ')
  .replace(/[|｜\-–—:：。「」『』【】（）()\[\]"]/g,'').trim();
const shouldShowDesc = (title?: string, desc?: string) => {
  if (!desc) return false;
  const d = desc.trim();
  if (d.length < 40 || d.length > 220) return false;
  const nt = norm(title || ''), nd = norm(d);
  if (nt && (nd === nt || nd.startsWith(nt))) return false;
  return true;
};

export default function InlineEmbedCard(props: Props) {
  const {
    postId,
    title,
    comment,
    tags,
    sourceUrl,
    thumbnailUrl,
    embedUrl,
    kind,
    autoOpen,
    alwaysOpen,
    showSourceLink = true,
    handle,
    adminHeader,
    footerExtras,
  } = props;

  const [open, setOpen] = useState<boolean>(!!autoOpen || !!alwaysOpen);
  const [count, setCount] = useState<number>(0);
  const [readable, setReadable] = useState<boolean>(false);
  const [canEmbed, setCanEmbed] = useState<boolean>(true);
  const [readerText, setReaderText] = useState<string | null>(null);
  const [lp, setLp] = useState<{ ok?: boolean; title?: string|null; description?: string|null; image?: string|null; site?: string; url?: string }|null>(null);
  const [lpText, setLpText] = useState<string | null>(null);
  const [mode, setMode] = useState<'iframe'|'preview'|'reader'>('preview');
  const reqRef = useRef(0);

  useEffect(() => {
    setOpen(!!autoOpen || !!alwaysOpen);
  }, [autoOpen, alwaysOpen]);

  const resolvedEmbedUrl = useMemo(() => {
    if (kind === "youtube") {
      return (embedUrl || sourceUrl).replace("watch?v=", "embed/") + "?rel=0";
    }
    return embedUrl || sourceUrl;
  }, [embedUrl, sourceUrl, kind]);

  useEffect(()=>{
    const myId = ++reqRef.current;
    (async()=>{
      if (kind === 'image' || kind === 'video') { setCanEmbed(true); setMode('iframe'); return; }
      try{
        const ce = await fetch(`/api/can-embed?url=${encodeURIComponent(resolvedEmbedUrl)}`).then(r=>r.json()).catch(()=>({ok:false,canEmbed:false}));
        if (reqRef.current !== myId) return;
        if(!ce?.ok || ce?.canEmbed === false){
          const lpr = await fetch(`/api/link-preview?url=${encodeURIComponent(sourceUrl)}`).then(r=>r.json()).catch(()=>({ok:false}));
          if (reqRef.current !== myId) return;
          setLp(lpr?.ok ? lpr : null);
          try{
            const ex = await fetch(`/api/article-extract?url=${encodeURIComponent(sourceUrl)}`).then(r=>r.json()).catch(()=>({ok:false}));
            if (reqRef.current !== myId) return;
            if (ex?.ok && typeof ex.text === 'string'){
              setLpText(makeIntroFromExtract(ex.text as string, lpr?.title || undefined, 180));
            } else setLpText(null);
          }catch{ setLpText(null); }
          setMode('preview');
          return;
        }
        setCanEmbed(true); setMode('iframe');
      }catch(_e){ if (reqRef.current === myId){ setCanEmbed(false); setMode('preview'); } }
    })();
    return ()=>{ reqRef.current++; };
  },[resolvedEmbedUrl, sourceUrl, kind]);

  const onShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: sourceUrl });
      } else {
        await navigator.clipboard.writeText(sourceUrl);
        alert("URLをコピーしました");
      }
    } catch (_) {}
  }, [title, sourceUrl]);

  const onEmpathize = useCallback(() => {
    if (!onceGuard(`empathize_${postId}`)) {
      alert("この投稿には既に共感済みです。");
      return;
    }
    setCount((v) => v + 1);
  }, [postId]);

  const onRemoval = useCallback(() => {
    if (!onceGuard(`removal_${postId}`)) {
      alert("この投稿への削除要請は既に送信済みです。");
      return;
    }
    alert("削除要請を受け付けました。");
  }, [postId]);

  return (
    <article className="card" data-post-id={postId}>
      {!alwaysOpen && (
        <button
          className="media"
          type="button"
          aria-label="埋め込みを開く"
          onClick={() => setOpen((v) => !v)}
        >
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="プレビュー" />
          ) : (
            <div style={{height: 8}} />
          )}
        </button>
      )}
      <div className="card-body">
        {adminHeader}
        <h2 className="title">{title}</h2>
        <div
          className="embed"
          aria-hidden={!(alwaysOpen || open)}
          style={{ marginTop: 8, display: (alwaysOpen || open) ? "block" : "none", overflowX: "hidden" }}
        >
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolvedEmbedUrl} alt="拡大画像" style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)" }} />
          ) : kind === "video" ? (
            <video src={resolvedEmbedUrl} controls playsInline style={{ width: "100%", borderRadius: 12, border: "1px solid var(--line)" }} />
          ) : mode === 'iframe' ? (
            <iframe
              src={resolvedEmbedUrl}
              width="100%"
              height={kind === "youtube" ? 315 : 600}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups"
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                background: readable ? "#fff" : undefined,
                filter: readable ? "invert(1) hue-rotate(180deg)" : undefined,
              }}
            />
          ) : mode === 'reader' ? (
            <div style={{border:'1px solid var(--line)',borderRadius:12,padding:12,background:'#fff'}}>
              <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',margin:0}}>{readerText || '(本文を取得できませんでした)'}</pre>
            </div>
          ) : (
            <div className="link-card">
              <div className="meta">
                {!lpText ? (
                  <div className="site" style={{color:'var(--muted)',fontSize:12}}>{lp?.site || hostOf(sourceUrl)}</div>
                ) : null}
                {lpText ? (
                  <p className="desc" style={{marginTop:8,color:'#111',fontSize:16,lineHeight:'1.8'}}>{lpText}</p>
                ) : shouldShowDesc(lp?.title || undefined, lp?.description || undefined) ? (
                  <p className="desc" style={{marginTop:8,color:'#111',fontSize:16,lineHeight:'1.8'}}>{lp!.description}</p>
                ) : null}
              </div>
            </div>
          )}
        </div>
        <div className="meta" style={{marginTop:8}}>
          <span className="handle">記録者：{formatHandle(handle)}</span>
          <span className="tags">{tags.map((t) => `#${t}`).join("・")}</span>
          {props.createdAt ? <time style={{marginLeft:8}}>{formatDateTime(props.createdAt)}</time> : null}
        </div>
        <div className="comment-label">記録者のコメント</div>
        <p className="comment">{comment || "(コメントなし)"}</p>
        <div className="actions">
          <button className="btn primary" onClick={onEmpathize}>
            共感する <span className="count">{count}</span>
          </button>
          <button className="btn" onClick={onShare}>シェア</button>
          <a className="btn source-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">引用元へ</a>
        </div>
        {footerExtras}
      </div>
    </article>
  );
}


