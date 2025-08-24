"use client";

import { useEffect, useState } from "react";

const PLACEHOLDER = "(無題)";

type Props = {
  postId: string;
  title?: string;
  comment: string;
  statusUrl: string;
  handle?: string;
};

const MODE_KEY = 'data-x-embed-mode';

function getTweetId(u: string){
  try{
    const url = new URL(u);
    const m = url.pathname.match(/status(?:es)?\/(\d{5,})/);
    return m ? m[1] : '';
  }catch{ return ''; }
}

function ensureWidgets(): Promise<any>{
  return new Promise((resolve)=>{
    const w: any = window as any;
    if (w.twttr?.widgets) return resolve(w.twttr);
    const s = document.createElement('script');
    s.src = "https://platform.twitter.com/widgets.js"; s.async = true;
    s.onload = () => resolve((window as any).twttr);
    document.head.appendChild(s);
  });
}

function attachAutoHeight(ifr: HTMLIFrameElement){
  const onMsg = (e: MessageEvent) => {
    if (e.source !== ifr.contentWindow) return;
    let d: any = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
    if (d && d.type === 'twttr.embed' && Number.isFinite(d.height)) {
      ifr.style.height = Math.max(300, d.height) + 'px';
    }
  };
  window.addEventListener('message', onMsg);
  return () => window.removeEventListener('message', onMsg);
}

async function renderOfficial(container: HTMLElement, statusUrl: string, timeoutMs = 6000){
  const id = getTweetId(statusUrl); if(!id) return false;
  const twttr = await Promise.race([ensureWidgets(), new Promise(res=>setTimeout(()=>res(null), timeoutMs))]);
  if(!twttr) return false;
  try{
    await twttr.widgets.createTweet(id, container, { dnt: true, lang: 'ja', conversation: 'none' });
  }catch{ return false; }
  return !!container.querySelector('iframe.twitter-tweet-rendered');
}

function renderIframe(container: HTMLElement, statusUrl: string): HTMLIFrameElement | null {
  const id = getTweetId(statusUrl); if(!id) return null;
  const ifr = document.createElement('iframe');
  ifr.src = `https://platform.twitter.com/embed/Tweet.html?id=${id}&dnt=1&hide_thread=1&lang=ja`;
  ifr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share';
  ifr.setAttribute('allowfullscreen', 'true');
  ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
  ifr.style.border = '0'; ifr.style.width = '100%'; ifr.style.maxWidth = '550px';
  ifr.style.minHeight = '300px'; ifr.setAttribute('loading','lazy');
  container.replaceChildren(ifr);
  return ifr;
}

function stripDisclaimers(s: string): string{
  return s
    .replace(/javascript is not available\.?/gi, '')
    .replace(/view on x/gi, '')
    .replace(/see on x/gi, '')
    .replace(/この投稿は表示できません。?/g, '')
    .replace(/pic\.twitter\.com\/\S+/gi, '')
    .trim();
}

function sanitizeForTitle(s: string): string{
  return stripDisclaimers(
    s
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[#＃][\p{L}0-9_一-龥ぁ-んァ-ンー]+/gu, '')
      .replace(/@\w+/g, '')
      .replace(/\s+/g, ' ')
  ).trim();
}

function truncateJa(s: string, limit = 32): string{
  if (s.length <= limit) return s;
  const punct = /[。．！？!?]/g;
  let idx = -1; let m: RegExpExecArray | null;
  while ((m = punct.exec(s)) && m.index <= limit) { idx = m.index; }
  if (idx >= 8) return s.slice(0, idx + 1);
  return s.slice(0, limit) + '…';
}

function formatHandle(h?: string): string {
  const t = (h || "").trim();
  if (!t) return "@guest";
  return t.startsWith("@") ? t : `@${t}`;
}

export default function XEmbedCard({ postId, title = "", comment, statusUrl, handle }: Props){
  const [fallback, setFallback] = useState<{text?:string; image?:string}>({});
  const [autoTitle, setAutoTitle] = useState<string | undefined>(undefined);

  // タイトル自動取得（ユーザー指定がない場合のみ）
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      const userTitle = (title || '').trim();
      if (userTitle && userTitle !== PLACEHOLDER) return;
      try{
        const r = await fetch(`/api/x-oembed?url=${encodeURIComponent(statusUrl)}`);
        const j = await r.json();
        let t = sanitizeForTitle(j?.text || '');
        if (!t && comment) t = sanitizeForTitle(comment);
        if (!cancelled && t) setAutoTitle(truncateJa(t, 32));
      }catch(_e){
        if (!cancelled && comment) setAutoTitle(truncateJa(sanitizeForTitle(comment), 32));
      }
    })();
    return ()=>{ cancelled = true; };
  },[statusUrl, title, comment]);

  const userTitle = (title || '').trim();
  const displayTitle = (userTitle && userTitle !== PLACEHOLDER ? userTitle : '') || autoTitle || "Xの投稿";

  useEffect(()=>{
    let cancelled = false;
    const cleanupFns: Array<() => void> = [];
    (async()=>{
      const block = document.querySelector(`[data-post-id="${postId}"] blockquote.twitter-tweet`) as HTMLElement | null;
      if(!block) return;
      if (block.getAttribute(MODE_KEY)) return; // 二重描画ガード
      const ok = await renderOfficial(block, statusUrl, 6000);
      if(cancelled) return;
      if(ok){
        const ifr = block.querySelector('iframe.twitter-tweet-rendered') as HTMLIFrameElement | null;
        if (ifr) cleanupFns.push(attachAutoHeight(ifr));
        block.setAttribute(MODE_KEY, 'official');
        return;
      }
      const ifr2 = renderIframe(block, statusUrl);
      if(cancelled) return;
      if(ifr2){
        cleanupFns.push(attachAutoHeight(ifr2));
        block.setAttribute(MODE_KEY, 'iframe');
        return;
      }
      try{
        const img = await fetch(`/api/x-screenshot?url=${encodeURIComponent(statusUrl)}`);
        if(img.ok){ const blob = await img.blob(); if(!cancelled) setFallback(p=>({ ...p, image: URL.createObjectURL(blob) })); }
        const s = await fetch(`/api/x-summary?url=${encodeURIComponent(statusUrl)}`);
        const sj = await s.json(); if(sj?.ok && !cancelled) setFallback(p=>({ ...p, text: sj.text }));
      }catch(_e){ /* ignore */ }
    })();
    return ()=>{ cancelled = true; cleanupFns.forEach(fn=>{ try{ fn(); }catch{} }); };
  },[postId, statusUrl]);

  return (
    <article className="card twitter-card" data-post-id={postId}>
      <div className="card-body">
        <h2 className="title">{displayTitle}</h2>
        <div className="meta"><span className="handle">{formatHandle(handle)}</span><span className="tags">#治安/マナー</span></div>
        <div className="comment-label">記録者のコメント</div>
        <p className="comment">{comment || "(コメントなし)"}</p>
        <blockquote className="twitter-tweet" data-dnt="true">
          <a href={statusUrl}>Xで見る</a>
        </blockquote>
        {(!fallback.text && !fallback.image) ? null : (
          <div style={{border:'1px solid var(--line)',borderRadius:12,padding:10,marginTop:8}}>
            {fallback.image ? (<img src={fallback.image} alt="Xサムネイル" style={{maxWidth:'100%',borderRadius:8}} />) : null}
            {fallback.text ? (<p className="comment" style={{marginTop:8}}>{fallback.text}</p>) : null}
          </div>
        )}
        <div className="actions" style={{marginTop:8}}>
          <button className="btn primary">共感する <span className="count">0</span></button>
          <a className="btn" href={statusUrl} target="_blank" rel="noopener noreferrer">シェア</a>
          <button className="btn subtle">削除要請</button>
        </div>
      </div>
    </article>
  );
}


