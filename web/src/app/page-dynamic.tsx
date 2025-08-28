"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import InlineEmbedCard from "@/components/InlineEmbedCard";
import XEmbedCard from "@/components/XEmbedCard";
import YouTubeEmbedCard from "@/components/YouTubeEmbedCard";

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts/simple')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setPosts(data.posts);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch posts:', err);
        setLoading(false);
      });
  }, []);

  const renderPost = (post: any) => {
    const url = post.url || '';
    
    // X/Twitter posts
    if (url.includes('x.com') || url.includes('twitter.com')) {
      return (
        <XEmbedCard
          key={post.id}
          postId={post.id}
          comment={post.comment}
          statusUrl={url}
        />
      );
    }
    
    // YouTube videos
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return (
        <YouTubeEmbedCard
          key={post.id}
          postId={post.id}
          title={post.title || 'YouTube動画'}
          comment={post.comment}
          tags={post.tags || ['動画']}
          sourceUrl={url}
          createdAt={post.created_at}
        />
      );
    }
    
    // Regular articles/pages
    return (
      <InlineEmbedCard
        key={post.id}
        postId={post.id}
        title={post.title || url}
        comment={post.comment}
        tags={post.tags || ['ニュース']}
        sourceUrl={url}
        thumbnailUrl=""
        embedUrl={url}
        kind="page"
        alwaysOpen
        createdAt={post.created_at}
      />
    );
  };

  return (
    <>
      <header className="site-header">
        <div className="site-brand">
          <Link href="/" className="brand-title">守ろう<span className="site-accent">日本</span></Link>
          <p className="brand-copy" style={{fontSize:14}}>日本のために記録し、伝える</p>
        </div>
      </header>
      <main className="container">
        <section className="feed" id="feed">
          {loading ? (
            <div style={{textAlign: 'center', padding: 50}}>
              <p>読み込み中...</p>
            </div>
          ) : posts.length > 0 ? (
            posts.map(post => renderPost(post))
          ) : (
            <div className="card" style={{padding: 20, textAlign: 'center'}}>
              <p>まだ投稿がありません</p>
            </div>
          )}
        </section>
        
        {/* 投稿フォーム */}
        <section id="compose" className="card" style={{padding:12, marginTop:16}}>
          <h2 className="title">記録する</h2>
          <form onSubmit={async (e)=>{
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const res = await fetch('/api/posts', { 
              method:'POST', 
              body: fd, 
              headers: { 
                'x-client-key': localStorage.getItem('kj_owner') || 
                  (localStorage.setItem('kj_owner', crypto.randomUUID()), 
                  localStorage.getItem('kj_owner') as string) 
              } 
            });
            const j = await res.json();
            if(j?.ok){ 
              alert('投稿しました'); 
              location.reload(); 
            } else { 
              alert('投稿に失敗しました'); 
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
            <div className="modal-actions" style={{marginTop:12}}>
              <button className="btn">下書き</button>
              <button className="btn primary" type="submit">記録</button>
            </div>
          </form>
        </section>
      </main>
      {/* フローティングボタン */}
      <a className="fab" href="#compose" aria-label="記録作成">＋記録</a>
    </>
  );
}
