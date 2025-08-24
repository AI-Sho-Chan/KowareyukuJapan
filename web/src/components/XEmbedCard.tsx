"use client";

import { useEffect, useState } from "react";

type Props = {
  postId: string;
  title?: string;
  comment: string;
  statusUrl: string;
};

export default function XEmbedCard({ postId, title = "Xの投稿", comment, statusUrl }: Props){
  const [fallback, setFallback] = useState<{text?:string; image?:string}>({});
  useEffect(()=>{
    // @ts-ignore
    if(!(window as any).twttr){
      const s = document.createElement('script');
      s.src = "https://platform.twitter.com/widgets.js"; s.async = true; s.charset = 'utf-8';
      document.body.appendChild(s);
    } else {
      // @ts-ignore
      (window as any).twttr.widgets.load();
    }
    // フォールバック: 5秒で未展開ならリンクを挿入
    const t = setTimeout(async()=>{
      const block = document.querySelector(`[data-post-id="${postId}"] blockquote.twitter-tweet`) as HTMLElement | null;
      const rendered = block?.querySelector('iframe.twitter-tweet-rendered');
      if(block && !rendered){
        try{
          const r = await fetch(`/api/x-oembed?url=${encodeURIComponent(statusUrl)}`);
          const j = await r.json();
          if(j?.ok && j?.html){
            // 親で置換して入れ子を避ける
            const wrapper = block.parentElement!;
            const tmp = document.createElement('div');
            tmp.innerHTML = j.html;
            if (tmp.firstElementChild) {
              wrapper.replaceChild(tmp.firstElementChild, block);
            }
            setFallback({ text: j.text || undefined });
          }
          else {
            // oEmbed不可→スクショ
            const img = await fetch(`/api/x-screenshot?url=${encodeURIComponent(statusUrl)}`);
            if(img.ok){ const blob = await img.blob(); setFallback({ image: URL.createObjectURL(blob) }); }
          }
        }catch(_e){}
      }
    },5000);
    return ()=>clearTimeout(t);
  },[]);

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


