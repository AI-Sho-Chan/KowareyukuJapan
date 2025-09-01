"use client";
import { useEffect, useMemo, useState } from 'react';

type Comment = { id: string; author_name: string; content: string; created_at: number };

export default function CommentsBox({ postId, ownerKey }: { postId: string; ownerKey?: string }){
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewerKey, setViewerKey] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/posts/${postId}/comments`);
        const j = await r.json().catch(() => null);
        if (j?.ok && Array.isArray(j.comments)) setComments(j.comments);
      } catch {}
      try {
        const k = localStorage.getItem('kj_owner') || (() => { const nk = crypto.randomUUID(); localStorage.setItem('kj_owner', nk); return nk; })();
        setViewerKey(k);
      } catch {}
    })();
  }, [postId]);

  const canPost = useMemo(() => {
    if (!ownerKey) return false;
    if (ownerKey === 'ADMIN_OPERATOR') {
      // First comment only
      return comments.length === 0;
    }
    // User post: only owner can comment
    return !!viewerKey && viewerKey === ownerKey;
  }, [ownerKey, comments.length, viewerKey]);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text.trim(), author_name: name.trim() || undefined, author_key: viewerKey })
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.ok) {
        setComments((v) => [...v, j.comment]);
        setText('');
      } else {
        alert(j?.error || 'コメントに失敗しました');
      }
    } catch { alert('コメントに失敗しました'); }
    finally { setBusy(false); }
  }

  return (
    <section className="card" style={{ padding: 12, marginTop: 12 }}>
      <h2 className="title">コメント</h2>
      <div style={{ display: 'grid', gap: 6 }}>
        {comments.map((c) => (
          <div key={c.id} className="notice" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{c.author_name || '名無しさん'}</div>
              <div>{c.content}</div>
            </div>
            <time style={{ color: 'var(--muted)' }}>{new Date((c.created_at || 0) * 1000).toLocaleString('ja-JP')}</time>
          </div>
        ))}
      </div>
      {canPost ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <input value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="お名前（任意）" />
            <textarea value={text} onChange={(e) => setText(e.currentTarget.value)} rows={3} placeholder="コメント" />
            <button className="btn primary" onClick={submit} disabled={busy} aria-busy={busy}>
              {busy ? '送信中…' : 'コメントを送信'}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--muted)' }}>
          {ownerKey === 'ADMIN_OPERATOR' ? 'この自動投稿は最初の1件のみコメント可能です。' : 'この投稿にコメントできるのは投稿者のみです。'}
        </p>
      )}
    </section>
  );
}

