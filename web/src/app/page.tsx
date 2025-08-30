"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import InlineEmbedCard from "@/components/InlineEmbedCard";
import OwnerControls from "@/components/OwnerControls";
import XEmbedCard from "@/components/XEmbedCard";

type Post = {
  id: string;
  url?: string;
  title?: string;
  comment?: string;
  tags?: string[];
  handle?: string;
  media?: { type: "image" | "video"; url: string };
  createdAt?: number;
  created_at?: string | number;
  ownerKey?: string;
};

const JP = {
  brandTitle: "\u5B88\u308D\u3046<span class=\"site-accent\">\u65E5\u672C</span>",
  brandCopy: "\u65E5\u672C\u306E\u305F\u3081\u306B\u8A18\u9332\u3057\u3001\u4F1D\u3048\u308B",
  loading: "\u8AAD\u307F\u8FBC\u307F\u4E2D...",
  noPosts: "\u307E\u3060\u6295\u7A3F\u304C\u3042\u308A\u307E\u305B\u3093",
  compose: "\u6295\u7A3F\u3059\u308B",
  titlePlaceholder: "\u4EFB\u610F\u306E\u30BF\u30A4\u30C8\u30EB",
  commentLabel: "\u30B3\u30E1\u30F3\u30C8\uFF08\uFF15\uFF10\u5B57\u4E0A\u9650\u30FB\u4EFB\u610F\uFF09",
  commentPlaceholder: "\u3042\u306A\u305F\u306E\u30B3\u30E1\u30F3\u30C8",
  handleLabel: "\u30CF\u30F3\u30C9\u30EB\uFF08\u4EFB\u610F\uFF09",
  draft: "\u4E0B\u66F8\u304D",
  submit: "\u6295\u7A3F",
  tagVideo: "\u52D5\u753B",
  tagNews: "\u30CB\u30E5\u30FC\u30B9",
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/posts", { cache: "no-store" });
        let data: any = null;
        try { data = await res.json(); } catch {}
        let merged: any[] = Array.isArray(data?.posts) ? data.posts : [];
        try {
          const r2 = await fetch("/api/posts/simple", { cache: "no-store" });
          const j2 = await r2.json().catch(() => null);
          if (j2?.ok && Array.isArray(j2.posts)) {
            merged = [...j2.posts, ...merged].filter((p: any, i: number, self: any[]) => self.findIndex((q: any) => q.id === p.id) === i);
          }
        } catch {}
        if (merged.length > 0) {
          const normalized = merged.map((p: any) => ({
            ...p,
            createdAt:
              typeof p.createdAt === "number" ? p.createdAt :
              (typeof p.createdAt === "string" ? Date.parse(p.createdAt) :
              (typeof p.created_at === "string" ? Date.parse(p.created_at) :
              (typeof p.created_at === "number" ? p.created_at : 0))),
          }));
          // 新しい投稿が上（降順）
          normalized.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          setPosts(normalized);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const renderPost = (post: Post) => {
    const url = post.url || "";
    if (url.includes("x.com") || url.includes("twitter.com")) {
      return (
        <XEmbedCard key={post.id} postId={post.id} comment={post.comment || ""} statusUrl={url} handle={post.handle} tags={post.tags} createdAt={post.createdAt} />
      );
    }
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return (
        <InlineEmbedCard
          key={post.id}
          postId={post.id}
          title={post.title || 'YouTube動画'}
          comment={post.comment || ''}
          tags={post.tags || [JP.tagVideo]}
          sourceUrl={url}
          embedUrl={url}
          kind="youtube"
          alwaysOpen
          createdAt={post.createdAt}
          handle={post.handle}
          ownerKey={post.ownerKey}
          footerExtras={<OwnerControls postId={post.id} ownerKey={post.ownerKey} title={post.title} comment={post.comment} />}
        />
      );
    }
    if (post.media?.url && post.media?.type) {
      const m = post.media;
      return (
        <InlineEmbedCard
          key={post.id}
          postId={post.id}
          title={post.title || (m.type === 'image' ? '画像' : '動画')}
          comment={post.comment || ''}
          tags={post.tags || (m.type === 'video' ? [JP.tagVideo] : [JP.tagNews])}
          sourceUrl={m.url}
          embedUrl={m.url}
          kind={m.type}
          alwaysOpen
          createdAt={post.createdAt}
          handle={post.handle}
          ownerKey={post.ownerKey}
          footerExtras={<OwnerControls postId={post.id} ownerKey={post.ownerKey} title={post.title} comment={post.comment} />}
        />
      );
    }
    return (
      <InlineEmbedCard
        key={post.id}
        postId={post.id}
        title={post.title || url}
        comment={post.comment || ''}
        tags={post.tags || [JP.tagNews]}
        sourceUrl={url}
        embedUrl={url}
        kind="page"
        alwaysOpen
        createdAt={post.createdAt}
        handle={post.handle}
        ownerKey={post.ownerKey}
        footerExtras={<OwnerControls postId={post.id} ownerKey={post.ownerKey} title={post.title} comment={post.comment} />}
      />
    );
  };

  return (
    <>
      <header className="site-header">
        <div className="site-brand">
          <Link href="/" className="brand-title" dangerouslySetInnerHTML={{ __html: JP.brandTitle }} />
          <p className="brand-copy" style={{ fontSize: 14 }} dangerouslySetInnerHTML={{ __html: JP.brandCopy }} />
        </div>
      </header>
      <main className="container">
        <section className="feed" id="feed">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}><p dangerouslySetInnerHTML={{ __html: JP.loading }} /></div>
          ) : posts.length > 0 ? (
            posts.map((p) => renderPost(p))
          ) : (
            <div className="card" style={{ padding: 20, textAlign: 'center' }}><p dangerouslySetInnerHTML={{ __html: JP.noPosts }} /></div>
          )}
        </section>

        <section id="compose" className="card" style={{ padding: 12, marginTop: 16 }}>
          <h2 className="title" dangerouslySetInnerHTML={{ __html: JP.compose }} />
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const fd = new FormData(form);
            const owner = localStorage.getItem('kj_owner') || (localStorage.setItem('kj_owner', crypto.randomUUID()), localStorage.getItem('kj_owner')) || '';
            let j: any = null;
            try {
              const res = await fetch('/api/posts', { method: 'POST', body: fd, headers: { 'x-client-key': owner! } });
              j = await res.json().catch(() => null);
            } catch {}
            if (!j?.ok) {
              try { const r2 = await fetch('/api/posts/simple', { method: 'POST', body: fd }); j = await r2.json().catch(() => null); } catch {}
            }
            if (j?.ok) { alert('投稿しました'); location.reload(); } else { alert('投稿に失敗しました'); }
          }}>
            <label className="radio">URL
              <input name="url" type="url" placeholder="https://..." style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: '#111' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
              <label className="radio">動画・画像のアップロード（端末から選択）</label>
              <input name="file" type="file" accept="image/*,video/*" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: 'var(--muted)' }} />
              <label className="radio">タイトル（任意）</label>
              <input name="title" type="text" placeholder={JP.titlePlaceholder} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: '#111' }} />
            </div>
            <label className="radio" style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: JP.commentLabel }} />
            <textarea name="comment" rows={2} maxLength={50} placeholder={JP.commentPlaceholder} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: '#111' }} />
            <label className="radio" style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: JP.handleLabel }} />
            <input name="handle" type="text" placeholder="@handle" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: '#111' }} />
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn" type="button" dangerouslySetInnerHTML={{ __html: JP.draft }} />
              <button className="btn primary" type="submit" dangerouslySetInnerHTML={{ __html: JP.submit }} />
            </div>
          </form>
        </section>
      </main>

      <footer style={{ marginTop: 24, padding: '16px 16px 48px', color: 'var(--muted)', fontSize: 13 }}>
        <div className="container">
          <a href="/privacy" style={{ marginRight: 12 }}>プライバシーポリシー</a>
          <a href="/terms">利用規約</a>
        </div>
      </footer>

      <a className="fab" href="#compose" aria-label="投稿作成">＋ 投稿</a>
    </>
  );
}
