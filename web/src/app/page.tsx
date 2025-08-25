"use client";
import Link from "next/link";
import InlineEmbedCard from "@/components/InlineEmbedCard";
import XEmbedCard from "@/components/XEmbedCard";
import YouTubeEmbedCard from "@/components/YouTubeEmbedCard";
import { useEffect, useState } from "react";

const FIXED_TAGS = ["治安/マナー","ニュース","政治/制度","動画","画像","外国人犯罪","中国人","クルド人","媚中政治家","財務省","官僚","左翼","保守","日本","帰化人","帰化人政治家","歴史捏造"] as const;

function formatHandle(h?: string): string {
  const t = (h || "").trim();
  if (!t) return "@guest";
  return t.startsWith("@") ? t : `@${t}`;
}

export default function Home() {
  const [posts, setPosts] = useState<Array<{
    id: string;
    url?: string;
    media?: { type: "image" | "video"; id: string; url: string };
    title: string;
    comment?: string;
    handle?: string;
    tags?: string[];
    createdAt: number;
  }>>([]);

  async function refresh(){
    const r = await fetch('/api/posts', { cache: 'no-store' });
    const j = await r.json();
    if (j?.ok && Array.isArray(j.posts)) setPosts(j.posts);
  }

  useEffect(() => { refresh(); }, []);

  async function updateTags(id: string, tags: string[]){
    await fetch(`/api/posts/${id}`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ tags }) });
    await refresh();
  }

  async function removePost(id: string){
    if (!confirm(`この投稿(${id})を削除します。よろしいですか？`)) return;
    const r = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    if (r.ok) { await refresh(); } else { alert('削除に失敗しました'); }
  }

  const isYT = (u?: string) => !!u && /https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(u);
  const isX  = (u?: string) => !!u && /https?:\/\/(x\.com|twitter\.com)\//i.test(u);

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
          {posts.map((p) => {
            const selected = new Set(p.tags || []);
            const TagEditor = (
              <details style={{marginTop:6}}>
                <summary style={{cursor:'pointer'}}>タグを編集</summary>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:6}}>
                  {FIXED_TAGS.map(t=>{
                    const checked = selected.has(t);
                    return (
                      <label key={t} style={{display:'inline-flex',alignItems:'center',gap:6}}>
                        <input type="checkbox" defaultChecked={checked} onChange={(e)=>{
                          const next = new Set(selected);
                          if (e.currentTarget.checked) next.add(t); else next.delete(t);
                          updateTags(p.id, Array.from(next));
                        }} />
                        <span>#{t}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            );

            const AdminHeader = (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <small style={{color:'var(--muted)'}}>管理番号: <code>{p.id}</code></small>
                <button className="btn" onClick={()=>removePost(p.id)}>削除</button>
              </div>
            );

            if (isX(p.url)) {
              return (
                <div key={p.id}>
                  {AdminHeader}
                  <XEmbedCard postId={p.id} title={p.title} comment={p.comment || ""} statusUrl={p.url!} handle={p.handle} />
                  {TagEditor}
                </div>
              );
            }

            if (p.url && isYT(p.url)) {
              return (
                <div key={p.id}>
                  <article className="card" data-post-id={p.id}>
                    <div className="card-body">
                      {AdminHeader}
                      <h2 className="title">{p.title}</h2>
                      <div className="meta"><span className="handle">記録者：{formatHandle(p.handle)}</span>{p.tags?.length ? <span className="tags">{p.tags.map(t=>`#${t}`).join('・')}</span> : null}</div>
                      <div className="comment-label">記録者のコメント</div>
                      <p className="comment">{p.comment || "(コメントなし)"}</p>
                      <div className="embed" style={{marginTop:8}}>
                        <YouTubeEmbedCard url={p.url!} />
                      </div>
                    </div>
                  </article>
                  {TagEditor}
                </div>
              );
            }

            if (p.media) {
              return (
                <div key={p.id}>
                  {AdminHeader}
                  <InlineEmbedCard
                    postId={p.id}
                    title={p.title}
                    comment={p.comment || ""}
                    tags={p.tags && p.tags.length ? p.tags : ["ユーザー投稿"]}
                    sourceUrl={p.url || p.media.url}
                    thumbnailUrl={p.media.type === 'image' ? p.media.url : undefined}
                    embedUrl={p.media.url}
                    kind={p.media.type}
                    alwaysOpen
                    createdAt={p.createdAt}
                    handle={p.handle}
                  />
                  {TagEditor}
                </div>
              );
            }

            if (p.url) {
              return (
                <div key={p.id}>
                  {AdminHeader}
                  <InlineEmbedCard
                    postId={p.id}
                    title={p.title}
                    comment={p.comment || ""}
                    tags={p.tags && p.tags.length ? p.tags : ["リンク"]}
                    sourceUrl={p.url}
                    embedUrl={p.url}
                    kind="page"
                    alwaysOpen
                    createdAt={p.createdAt}
                    handle={p.handle}
                  />
                  {TagEditor}
                </div>
              );
            }

            return null;
          })}
        </section>
        <section id="compose" className="card" style={{padding:12, marginTop:16}}>
          <h2 className="title">記録する</h2>
          <form method="post" encType="multipart/form-data" onSubmit={async (e)=>{
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const checked = Array.from(form.querySelectorAll('input[name="tag"]:checked')) as HTMLInputElement[];
            checked.forEach(ch => fd.append('tags', ch.value));
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
            <div style={{marginTop:8}}>
              <div className="comment-label">カテゴリー（任意・複数可）</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {FIXED_TAGS.map(t=> (
                  <label key={t} className="radio" style={{display:'inline-flex',alignItems:'center',gap:6}}>
                    <input type="checkbox" name="tag" value={t} /> <span>#{t}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions" style={{marginTop:12}}>
              <button className="btn" type="button">下書き</button>
              <button className="btn primary" type="submit">記録</button>
            </div>
          </form>
        </section>
      </main>
      <a className="fab" href="#compose" aria-label="記録作成">＋記録</a>
    </>
  );
}
