'use client';

import { useEffect, useState } from 'react';

type Row = { id:string; title:string; url?:string; comment?:string; handle?:string; created_at:string };

export default function DeletedPostsPage(){
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ (async()=>{
    try{
      const r = await fetch('/api/admin/hidden-posts');
      const j = await r.json().catch(()=>null);
      if(j?.ok) setItems(j.posts||[]);
    } finally { setLoading(false); }
  })(); },[]);
  return (
    <main className="container" style={{padding:12}}>
      <h1>削除済み（アーカイブ）投稿</h1>
      {loading ? <p>読み込み中…</p> : items.length===0 ? <p>項目なし</p> : (
        <div className="list">
          {items.map(p => (
            <div key={p.id} className="list-item" style={{padding:8, borderBottom:'1px solid var(--line)'}}>
              <div style={{fontWeight:700}}>{p.title || p.url}</div>
              <div style={{fontSize:12, color:'var(--muted)'}}>{p.url}</div>
              <div style={{fontSize:12}}>{new Date(p.created_at).toLocaleString('ja-JP')}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

