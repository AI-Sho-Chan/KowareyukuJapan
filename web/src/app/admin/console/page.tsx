"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Post = { id: string; title: string; url?: string; comment?: string; handle?: string; createdAt?: number|string; is_published?: number };
type Summary = { postsTotal:number; postsHidden:number; events:Record<string,number>; eventsToday:Record<string,number> };

export default function AdminConsole(){
  const [auth, setAuth] = useState<'unknown'|'ok'|'ng'>('unknown');
  const [summary, setSummary] = useState<Summary|null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [handleFilter, setHandleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [includeAll, setIncludeAll] = useState(false);

  useEffect(()=>{
    (async()=>{
      const ok = await fetch('/api/admin/analytics').then(r=>r.ok).catch(()=>false);
      setAuth(ok?'ok':'ng');
      if(ok){ await Promise.all([reloadSummary(), reloadPosts()]); }
    })();
  },[]);

  async function reloadSummary(){
    const j = await fetch('/api/admin/analytics').then(r=>r.json()).catch(()=>null);
    setSummary(j?.summary||null);
  }
  async function reloadPosts(){
    const params = new URLSearchParams();
    if(query) params.set('q', query);
    if(handleFilter) params.set('handle', handleFilter);
    if(dateFilter) params.set('date', dateFilter);
    if(includeAll) params.set('include', 'all');
    const url = '/api/admin/posts/list' + (params.toString()?('?'+params.toString()):'');
    const j = await fetch(url).then(r=>r.json()).catch(()=>({posts:[]}));
    setPosts(Array.isArray(j.posts)? (j.posts as Post[]): []);
  }

  async function bulk(action:'hide'|'publish'|'delete'){
    if(selected.size===0){ alert('対象がありません'); return; }
    if(action==='delete' && !confirm('選択した投稿を削除します。よろしいですか？')) return;
    const ids = Array.from(selected);
    const r = await fetch('/api/admin/posts/bulk', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action, ids }) });
    if(r.ok){ await reloadPosts(); setSelected(new Set()); }
    else alert('一括処理に失敗しました');
  }

  const ev = summary?.events || {};
  const evToday = summary?.eventsToday || {};

  if(auth==='unknown') return (<main className="container" style={{padding:16}}><div>読み込み中…</div></main>);
  if(auth==='ng') return (
    <main className="container" style={{maxWidth:560, padding:16}}>
      <h1 className="title">管理ログインが必要です</h1>
      <div className="card" style={{padding:12, marginTop:12}}>
        <p>このページは管理者用です。ログインしてください。</p>
        <div className="modal-actions" style={{marginTop:8}}>
          <Link className="btn" href="/admin">管理ログインへ</Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="container" style={{padding:12}}>
      <header className="card" style={{padding:12}}>
        <h1 className="title">管理コンソール</h1>
        <div className="notice"><div className="notice-title">イベント（累計）</div><div>view:{ev.view||0} empathy:{ev.empathy||0} share:{ev.share||0}</div></div>
        <div className="notice"><div className="notice-title">今日</div><div>view:{evToday.view||0} empathy:{evToday.empathy||0} share:{evToday.share||0}</div></div>
        <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
          <input value={query} onChange={e=>setQuery(e.currentTarget.value)} placeholder="検索 (タイトル/コメント/URL)" style={{flex:1}} />
          <Link className="btn" href="/admin/feeds">フィード管理</Link>
          <Link className="btn" href="/">サイトに戻る</Link>
        </div>
      </header>

      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">投稿一覧</h2>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, marginBottom:8}}>
          <input placeholder="ハンドル（任意）" value={handleFilter} onChange={e=>setHandleFilter(e.currentTarget.value)} />
          <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.currentTarget.value)} />
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <label style={{fontSize:12, display:'inline-flex', alignItems:'center', gap:6}}>
              <input type="checkbox" checked={includeAll} onChange={e=>setIncludeAll((e.currentTarget as HTMLInputElement).checked)} /> 非公開を含める
            </label>
            <button className="btn" onClick={reloadPosts}>検索</button>
          </div>
        </div>
        <div className="modal-actions" style={{marginBottom:8}}>
          <button className="btn" onClick={()=>bulk('publish')}>公開</button>
          <button className="btn" onClick={()=>bulk('hide')}>非公開</button>
          <button className="btn" onClick={()=>bulk('delete')}>削除</button>
        </div>
        <div className="list">
          {posts.map(p => (
            <div key={p.id} className="list-item" style={{display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8, alignItems:'center'}}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={e=>{ const s=new Set(selected); if((e.currentTarget as HTMLInputElement).checked) s.add(p.id); else s.delete(p.id); setSelected(s); }} />
              <div>
                <div style={{fontWeight:700}}>{(()=>{ const u=(p.url||'').toLowerCase(); const isX=u.includes('x.com')||u.includes('twitter.com'); const isIG=u.includes('instagram.com'); const first=(p.comment||'').split('\n')[0]||''; return (isX||isIG)?(p.title||first||p.url):(p.title||p.url); })()}</div>
                <div style={{fontSize:12, color:'var(--muted)'}}>{p.url}</div>
              </div>
              <div style={{display:'flex', gap:4}}>
                <span className="pill" title="公開状況">{p.is_published? '公開':'非公開'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{marginTop:16}}><Link href="/">サイトに戻る</Link></footer>
    </main>
  );
}

