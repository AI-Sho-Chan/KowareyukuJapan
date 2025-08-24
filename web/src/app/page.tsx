"use client";
import Link from "next/link";
import InlineEmbedCard from "@/components/InlineEmbedCard";
import XEmbedCard from "@/components/XEmbedCard";
import { useEffect, useState } from "react";

export default function Home() {
  const [posts, setPosts] = useState<Array<{
    id: string;
    url?: string;
    media?: { type: "image" | "video"; id: string; url: string };
    title: string;
    comment?: string;
    handle?: string;
    createdAt: number;
  }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/posts', { cache: 'no-store' });
        const j = await r.json();
        if (j?.ok && Array.isArray(j.posts)) setPosts(j.posts);
      } catch {}
    })();
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="site-brand">
          <Link href="/" className="brand-title">守ろう<span className="site-accent">JAPAN</span></Link>
          <p className="brand-copy" style={{fontSize:14}}>日本のために記録し、伝える</p>
        </div>
      </header>
      <main className="container">
        <section className="feed" id="feed">
          {/* ユーザー投稿 */}
          {posts.map((p) => {
            const isX = p.url && /https?:\/\/(x\.com|twitter\.com)\//i.test(p.url);
            if (isX) {
              return (
                <XEmbedCard key={p.id} postId={p.id} title={p.title} comment={p.comment || ""} statusUrl={p.url!} />
              );
            }
            if (p.media) {
              return (
                <InlineEmbedCard
                  key={p.id}
                  postId={p.id}
                  title={p.title}
                  comment={p.comment || ""}
                  tags={["ユーザー投稿"]}
                  sourceUrl={p.url || p.media.url}
                  thumbnailUrl={p.media.type === 'image' ? p.media.url : undefined}
                  embedUrl={p.media.url}
                  kind={p.media.type}
                  alwaysOpen
                  createdAt={p.createdAt}
                />
              );
            }
            if (p.url) {
              return (
                <InlineEmbedCard
                  key={p.id}
                  postId={p.id}
                  title={p.title}
                  comment={p.comment || ""}
                  tags={["リンク"]}
                  sourceUrl={p.url}
                  embedUrl={p.url}
                  kind="page"
                  alwaysOpen
                  createdAt={p.createdAt}
                />
              );
            }
            return (
              <article key={p.id} className="card" data-post-id={p.id}>
                <div className="card-body">
                  <h2 className="title">{p.title}</h2>
                  <p className="comment">{p.comment || ""}</p>
                </div>
              </article>
            );
          })}
        </section>
        {/* 投稿フォーム */}
        <section id="compose" className="card" style={{padding:12, marginTop:16}}>
          <h2 className="title">記録する</h2>
          <form onSubmit={async (e)=>{
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const res = await fetch('/api/posts', { method:'POST', body: fd, headers: { 'x-client-key': localStorage.getItem('kj_owner') || (localStorage.setItem('kj_owner', crypto.randomUUID()), localStorage.getItem('kj_owner') as string) } });
            const j = await res.json();
            if(j?.ok){ alert('投稿しました（デモ: 再読み込みで反映）'); location.reload(); } else { alert('投稿に失敗しました'); }
          }}>
            <label className="radio">URL
              <input name="url" type="url" placeholder="https://..." style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
              <label className="radio">動画／画像のアップロード（端末から選択）
                <input name="file" type="file" accept="image/*,video/*" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'var(--muted)'}} />
              </label>
              <label className="radio">タイトル（任意）
                <input name="title" type="text" placeholder="任意のタイトル" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
              </label>
            </div>
            <label className="radio" style={{marginTop:8}}>コメント（50字上限・任意）
              <textarea name="comment" rows={2} maxLength={50} placeholder="あなたのコメント" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <label className="radio" style={{marginTop:8}}>ハンドル（任意）
              <input name="handle" type="text" placeholder="@handle" style={{width:'100%',padding:10,borderRadius:10,border:'1px solid var(--line)',background:'#fff',color:'#111'}} />
            </label>
            <div className="modal-actions" style={{marginTop:12}}>
              <button className="btn">下書き</button>
              <button className="btn primary" type="submit">記録</button>
            </div>
          </form>
        </section>
      </main>
      <a className="fab" href="#compose" aria-label="記録作成">＋記録</a>
    </>
  );
}
