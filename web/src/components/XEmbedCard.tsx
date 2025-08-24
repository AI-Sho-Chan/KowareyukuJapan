"use client";

import { useEffect, useState } from "react";

type Props = {
  postId: string;
  title?: string;
  comment: string;
  statusUrl: string;
};

function getTweetId(u: string){
  const m = u.match(/status\/(\d+)/); return m ? m[1] : '';
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

async function renderOfficial(container: HTMLElement, statusUrl: string, timeoutMs = 6000){
  const id = getTweetId(statusUrl); if(!id) return false;
  const twttr = await Promise.race([ensureWidgets(), new Promise(res=>setTimeout(()=>res(null), timeoutMs))]);
  if(!twttr) return false;
  try{
    await twttr.widgets.createTweet(id, container, { dnt: true, lang: 'ja', conversation: 'none' });
  }catch{ return false; }
  return !!container.querySelector('iframe.twitter-tweet-rendered');
}

function renderIframe(container: HTMLElement, statusUrl: string){
  const id = getTweetId(statusUrl); if(!id) return false;
  const ifr = document.createElement('iframe');
  ifr.src = `https://platform.twitter.com/embed/Tweet.html?dnt=1&hide_thread=1&lang=ja&id=${id}`;
  ifr.allow = 'autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share';
  ifr.sandbox = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';
  ifr.style.border = '0'; ifr.style.width = '100%'; ifr.style.maxWidth = '550px';
  ifr.style.minHeight = '250px'; ifr.setAttribute('loading','lazy');
  container.replaceChildren(ifr);
  const onMsg = (e: MessageEvent)=>{
    if(!ifr.contentWindow || e.source !== ifr.contentWindow) return;
    if(typeof e.data === 'string'){
      const m = e.data.match(/height=(\d+)/); if(m) ifr.style.height = Math.max(250, +m[1]) + 'px';
    }
  };
  window.addEventListener('message', onMsg);
  return true;
}

export default function XEmbedCard({ postId, title = "Xの投稿", comment, statusUrl }: Props){
  const [fallback, setFallback] = useState<{text?:string; image?:string}>({});
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      const block = document.querySelector(`[data-post-id="${postId}"] blockquote.twitter-tweet`) as HTMLElement | null;
      if(!block) return;
      // 1) 公式埋め込み
      const ok = await renderOfficial(block, statusUrl, 6000);
      if(cancelled) return;
      if(ok){
        // IFRAME生成の検知はrenderOfficial内で実施
        return;
      }
      // 2) 直接IFRAME埋め込み
      const ok2 = renderIframe(block, statusUrl);
      if(cancelled) return;
      if(ok2) return;
      // 3) スクショ + 要約
      try{
        const img = await fetch(`/api/x-screenshot?url=${encodeURIComponent(statusUrl)}`);
        if(img.ok){ const blob = await img.blob(); if(!cancelled) setFallback(p=>({ ...p, image: URL.createObjectURL(blob) })); }
        const s = await fetch(`/api/x-summary?url=${encodeURIComponent(statusUrl)}`);
        const sj = await s.json(); if(sj?.ok && !cancelled) setFallback(p=>({ ...p, text: sj.text }));
      }catch(_e){ /* ignore */ }
    })();
    return ()=>{ cancelled = true; };
  },[postId, statusUrl]);

  return (
    <article className="card" data-post-id={postId}>
      <div className="card-body">
        <h2 className="title">{title}</h2>
        <div className="meta"><span className="handle">@guest</span><span className="tags">#治安/マナー</span></div>
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


