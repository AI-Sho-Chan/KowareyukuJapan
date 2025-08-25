"use client";
import Link from "next/link";
import InlineEmbedCard from "@/components/InlineEmbedCard";
import XEmbedCard from "@/components/XEmbedCard";
import YouTubeEmbedCard from "@/components/YouTubeEmbedCard";
import InstagramEmbedCard from "@/components/InstagramEmbedCard";
import TikTokEmbedCard from "@/components/TikTokEmbedCard";
import ThreadsEmbedCard from "@/components/ThreadsEmbedCard";
import NicoVideoEmbedCard from "@/components/NicoVideoEmbedCard";
import NoteEmbedCard from "@/components/NoteEmbedCard";
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
  const [viewerKey, setViewerKey] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  async function refresh(){
    const r = await fetch('/api/posts', { cache: 'no-store' });
    const j = await r.json();
    if (j?.ok && Array.isArray(j.posts)) setPosts(j.posts);
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('kj_owner') || localStorage.getItem('ownerKey') || '';
      setViewerKey(v);
    }
  }, []);

  async function updateTags(id: string, tags: string[]){
    await fetch(`/api/posts/${id}`, { method:'PATCH', headers:{'content-type':'application/json','x-owner-key': viewerKey }, body: JSON.stringify({ tags }) });
    await refresh();
  }

  async function updateComment(id: string, comment: string){
    await fetch(`/api/posts/${id}`, { method:'PATCH', headers:{'content-type':'application/json','x-owner-key': viewerKey }, body: JSON.stringify({ comment }) });
    await refresh();
  }

  async function removePost(id: string){
    if (!confirm(`この投稿(${id})を削除します。よろしいですか？`)) return;
    const r = await fetch(`/api/posts/${id}`, { method: 'DELETE', headers: { 'x-owner-key': viewerKey } });
    if (r.ok) { await refresh(); } else { alert('削除に失敗しました'); }
  }

  const isYT = (u?: string) => !!u && /https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(u);
  const isX  = (u?: string) => !!u && /https?:\/\/(x\.com|twitter\.com)\//i.test(u);
  const isIG = (u?: string) => !!u && /https?:\/\/(www\.)?instagram\.com\//i.test(u);
  const isTikTok = (u?: string) => !!u && /https?:\/\/www\.tiktok\.com\//i.test(u || '');
  const isThreads = (u?: string) => !!u && /https?:\/\/(www\.)?threads\.net\//i.test(u || '');
  const isNico = (u?: string) => !!u && /https?:\/\/(www\.)?nicovideo\.jp\//i.test(u || '');
  const isNote = (u?: string) => !!u && /https?:\/\/(www\.)?note\.com\//i.test(u || '');

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
            const isOwner = !!viewerKey && !!(p as any).ownerKey && viewerKey === (p as any).ownerKey;
            const TagEditor = !isOwner ? null : (
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
            const OwnerActions = !isOwner ? null : (
              <div style={{display:'flex',gap:8,marginTop:8}}>
                <button className="btn" onClick={()=>{
                  const next = prompt('コメントを編集', p.comment || '') ?? undefined;
                  if (typeof next === 'string') updateComment(p.id, next);
                }}>コメントを編集</button>
                <button className="btn" onClick={()=>removePost(p.id)}>削除</button>
              </div>
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
                  <XEmbedCard
                    postId={p.id}
                    title={p.title}
                    comment={p.comment || ""}
                    statusUrl={p.url!}
                    handle={p.handle}
                    tags={p.tags}
                    createdAt={p.createdAt}
                    adminHeader={AdminHeader}
                  />
                  {TagEditor}
                  {OwnerActions}
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
                      <div className="embed" style={{marginTop:8}}>
                        <YouTubeEmbedCard url={p.url!} />
                      </div>
                      <div className="meta" style={{marginTop:8}}>
                        <span className="handle">記録者：{formatHandle(p.handle)}</span>
                        {p.tags?.length ? <span className="tags">{p.tags.map(t=>`#${t}`).join('・')}</span> : null}
                        {p.createdAt ? <time style={{marginLeft:8}}>{new Date(p.createdAt).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time> : null}
                      </div>
                      <div className="comment-label">記録者のコメント</div>
                      <p className="comment">{p.comment || "(コメントなし)"}</p>
                      <div className="actions" style={{marginTop:8}}>
                        <button className="btn primary" onClick={()=>alert('共感しました（デモ）')}>共感する</button>
                        <button className="btn" onClick={async()=>{ try{ if(navigator.share){ await navigator.share({ title: p.title, url: p.url! }); } else { await navigator.clipboard.writeText(p.url!); alert('URLをコピーしました'); } }catch{} }}>シェア</button>
                        <a className="btn source-link" href={p.url!} target="_blank" rel="noopener noreferrer">引用元へ</a>
                      </div>
                      <div className="actions" style={{marginTop:8}}>
                        <button className="btn primary" onClick={()=>alert('共感しました（デモ）')}>共感する</button>
                        <button className="btn" onClick={async()=>{ try{ if(navigator.share){ await navigator.share({ title: p.title, url: p.url! }); } else { await navigator.clipboard.writeText(p.url!); alert('URLをコピーしました'); } }catch{} }}>シェア</button>
                        <a className="btn source-link" href={p.url!} target="_blank" rel="noopener noreferrer">引用元へ</a>
                      </div>
                    </div>
                  </article>
                  {TagEditor}
                  {OwnerActions}
                </div>
              );
            }

            if (p.url && isIG(p.url)){
              return (
                <div key={p.id}>
                  <article className="card" data-post-id={p.id}>
                    <div className="card-body">
                      {AdminHeader}
                      <h2 className="title">{p.title}</h2>
                      <div className="embed" style={{marginTop:8}}>
                        <InstagramEmbedCard url={p.url!} />
                      </div>
                      <div className="meta" style={{marginTop:8}}>
                        <span className="handle">記録者：{formatHandle(p.handle)}</span>
                        {p.tags?.length ? <span className="tags">{p.tags.map(t=>`#${t}`).join('・')}</span> : null}
                        {p.createdAt ? <time style={{marginLeft:8}}>{new Date(p.createdAt).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time> : null}
                      </div>
                      <div className="comment-label">記録者のコメント</div>
                      <p className="comment">{p.comment || "(コメントなし)"}</p>
                      <div className="actions" style={{marginTop:8}}>
                        <button className="btn primary" onClick={()=>alert('共感しました（デモ）')}>共感する</button>
                        <button className="btn" onClick={async()=>{ try{ if(navigator.share){ await navigator.share({ title: p.title, url: p.url! }); } else { await navigator.clipboard.writeText(p.url!); alert('URLをコピーしました'); } }catch{} }}>シェア</button>
                        <a className="btn source-link" href={p.url!} target="_blank" rel="noopener noreferrer">引用元へ</a>
                      </div>
                      <div className="actions" style={{marginTop:8}}>
                        <button className="btn primary" onClick={()=>alert('共感しました（デモ）')}>共感する</button>
                        <button className="btn" onClick={async()=>{ try{ if(navigator.share){ await navigator.share({ title: p.title, url: p.url! }); } else { await navigator.clipboard.writeText(p.url!); alert('URLをコピーしました'); } }catch{} }}>シェア</button>
                        <a className="btn source-link" href={p.url!} target="_blank" rel="noopener noreferrer">引用元へ</a>
                      </div>
                    </div>
                  </article>
                  {TagEditor}
                  {OwnerActions}
                </div>
              );
            }

            if (p.url && isTikTok(p.url)){
              return (
                <div key={p.id}>
                  <article className="card" data-post-id={p.id}>
                    <div className="card-body">
                      {AdminHeader}
                      <h2 className="title">{p.title}</h2>
                      <div className="embed" style={{marginTop:8}}>
                        <TikTokEmbedCard url={p.url!} />
                      </div>
                      <div className="meta" style={{marginTop:8}}>
                        <span className="handle">記録者：{formatHandle(p.handle)}</span>
                        {p.tags?.length ? <span className="tags">{p.tags.map(t=>`#${t}`).join('・')}</span> : null}
                        {p.createdAt ? <time style={{marginLeft:8}}>{new Date(p.createdAt).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time> : null}
                      </div>
                      <div className="comment-label">記録者のコメント</div>
                      <p className="comment">{p.comment || "(コメントなし)"}</p>
                      <div className="actions" style={{marginTop:8}}>
                        <button className="btn primary" onClick={()=>alert('共感しました（デモ）')}>共感する</button>
                        <button className="btn" onClick={async()=>{ try{ if(navigator.share){ await navigator.share({ title: p.title, url: p.url! }); } else { await navigator.clipboard.writeText(p.url!); alert('URLをコピーしました'); } }catch{} }}>シェア</button>
                        <a className="btn source-link" href={p.url!} target="_blank" rel="noopener noreferrer">引用元へ</a>
                      </div>
                    </div>
                  </article>
                  {TagEditor}
                  {OwnerActions}
                </div>
              );
            }

            if (p.url && isThreads(p.url)){
              return (
                <div key={p.id}>
                  <article className="card" data-post-id={p.id}>
                    <div className="card-body">
                      {AdminHeader}
                      <h2 className="title">{p.title}</h2>
                      <div className="embed" style={{marginTop:8}}>
                        <ThreadsEmbedCard url={p.url!} />
                      </div>
                      <div className="meta" style={{marginTop:8}}>
                        <span className="handle">記録者：{formatHandle(p.handle)}</span>
                        {p.tags?.length ? <span className="tags">{p.tags.map(t=>`#${t}`).join('・')}</span> : null}
                        {p.createdAt ? <time style={{marginLeft:8}}>{new Date(p.createdAt).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time> : null}
                      </div>
                      <div className="comment-label">記録者のコメント</div>
                      <p className="comment">{p.comment || "(コメントなし)"}</p>
                      <div className="actions" style={{marginTop:8}}>
                        <button className="btn primary" onClick={()=>alert('共感しました（デモ）')}>共感する</button>
                        <button className="btn" onClick={async()=>{ try{ if(navigator.share){ await navigator.share({ title: p.title, url: p.url! }); } else { await navigator.clipboard.writeText(p.url!); alert('URLをコピーしました'); } }catch{} }}>シェア</button>
                        <a className="btn source-link" href={p.url!} target="_blank" rel="noopener noreferrer">引用元へ</a>
                      </div>
                    </div>
                  </article>
                  {TagEditor}
                  {OwnerActions}
                </div>
              );
            }

            if (p.url && isNico(p.url)){
              return (
                <div key={p.id}>
                  <article className="card" data-post-id={p.id}>
                    <div className="card-body">
                      {AdminHeader}
                      <h2 className="title">{p.title}</h2>
                      <div className="embed" style={{marginTop:8}}>
                        <NicoVideoEmbedCard url={p.url!} />
                      </div>
                      <div className="meta" style={{marginTop:8}}>
                        <span className="handle">記録者：{formatHandle(p.handle)}</span>
                        {p.tags?.length ? <span className="tags">{p.tags.map(t=>`#${t}`).join('・')}</span> : null}
                        {p.createdAt ? <time style={{marginLeft:8}}>{new Date(p.createdAt).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time> : null}
                      </div>
                      <div className="comment-label">記録者のコメント</div>
                      <p className="comment">{p.comment || "(コメントなし)"}</p>
                    </div>
                  </article>
                  {TagEditor}
                  {OwnerActions}
                </div>
              );
            }

            if (p.url && isNote(p.url)){
              return (
                <div key={p.id}>
                  <article className="card" data-post-id={p.id}>
                    <div className="card-body">
                      {AdminHeader}
                      <h2 className="title">{p.title}</h2>
                      <div className="embed" style={{marginTop:8}}>
                        <NoteEmbedCard url={p.url!} />
                      </div>
                      <div className="meta" style={{marginTop:8}}>
                        <span className="handle">記録者：{formatHandle(p.handle)}</span>
                        {p.tags?.length ? <span className="tags">{p.tags.map(t=>`#${t}`).join('・')}</span> : null}
                        {p.createdAt ? <time style={{marginLeft:8}}>{new Date(p.createdAt).toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</time> : null}
                      </div>
                      <div className="comment-label">記録者のコメント</div>
                      <p className="comment">{p.comment || "(コメントなし)"}</p>
                    </div>
                  </article>
                  {TagEditor}
                  {OwnerActions}
                </div>
              );
            }

            if (p.media) {
              return (
                <div key={p.id}>
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
                    adminHeader={AdminHeader}
                  />
                  {TagEditor}
                  {OwnerActions}
                </div>
              );
            }

            if (p.url) {
              return (
                <div key={p.id}>
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
                    adminHeader={AdminHeader}
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

            async function downscaleImageFile(file: File, maxW = 1600, maxH = 1600, quality = 0.85): Promise<File> {
              return new Promise((resolve) => {
                try {
                  const img = new Image();
                  const url = URL.createObjectURL(file);
                  img.onload = () => {
                    const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
                    const w = Math.max(1, Math.round(img.width * ratio));
                    const h = Math.max(1, Math.round(img.height * ratio));
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { URL.revokeObjectURL(url); return resolve(file); }
                    ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob((blob) => {
                      URL.revokeObjectURL(url);
                      if (!blob) return resolve(file);
                      const out = new File([blob], (file.name || 'image').replace(/\.(png|jpe?g|webp|gif)$/i, '') + '.jpg', { type: 'image/jpeg' });
                      resolve(out);
                    }, 'image/jpeg', quality);
                  };
                  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
                  img.src = url;
                } catch { resolve(file); }
              });
            }

            try {
              setUploading(true); setUploadMsg('アップロード中…');
              const checked = Array.from(form.querySelectorAll('input[name="tag"]:checked')) as HTMLInputElement[];
              checked.forEach(ch => fd.append('tags', ch.value));

              const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement | null;
              const sel = fileInput?.files?.[0];
              if (sel) {
                const isImage = sel.type.startsWith('image/');
                const isVideo = sel.type.startsWith('video/');
                const MAX_VIDEO = 60 * 1024 * 1024; // 60MB
                if (isVideo && sel.size > MAX_VIDEO) {
                  setUploadMsg('動画サイズが大きすぎます（最大60MB）');
                  setUploading(false);
                  return;
                }
                if (isImage) {
                  const small = await downscaleImageFile(sel, 1600, 1600, 0.85);
                  if (small !== sel) {
                    fd.delete('file');
                    fd.append('file', small, small.name);
                  }
                }
              }

              const res = await fetch('/api/posts', { method:'POST', body: fd, headers: { 'x-client-key': localStorage.getItem('kj_owner') || (localStorage.setItem('kj_owner', crypto.randomUUID()), localStorage.getItem('kj_owner') as string) } });
              const j = await res.json();
              if(j?.ok){
                setUploadMsg('アップロード完了');
                await refresh();
                form.reset();
              } else {
                setUploadMsg('アップロードに失敗しました');
                alert('投稿に失敗しました');
              }
            } finally {
              setUploading(false);
            }
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
            <div className="modal-actions" style={{marginTop:12, display:'flex', alignItems:'center', gap:8}}>
              <button className="btn" type="button">下書き</button>
              <button className="btn primary" type="submit" disabled={uploading} aria-busy={uploading}>{uploading ? 'アップロード中…' : '記録'}</button>
              {uploadMsg ? <small style={{color: uploadMsg.includes('完了') ? 'var(--muted)' : 'crimson'}}>{uploadMsg}</small> : null}
            </div>
          </form>
        </section>
      </main>
      <a className="fab" href="#compose" aria-label="記録作成">＋記録</a>
    </>
  );
}
