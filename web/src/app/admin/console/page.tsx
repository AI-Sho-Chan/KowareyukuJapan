"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Post = { id: string; title: string; url?: string; comment?: string; handle?: string; tags?: string[]; ownerKey?: string; createdAt?: number|string; is_published?: number };

export default function AdminConsole(){
  const [auth, setAuth] = useState<'unknown'|'ok'|'ng'>('unknown');
  const [adminKey, setAdminKey] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [flags, setFlags] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState('');\n  const [handleFilter, setHandleFilter] = useState('');\n  const [dateFilter, setDateFilter] = useState('');\n  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [notes, setNotes] = useState<{ lastUpdated: number; markdown: string } | null>(null);
  const [topics, setTopics] = useState<{ id:string; keyword:string; enabled:boolean; minIntervalMinutes:number }[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [newTopicMin, setNewTopicMin] = useState(60);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(()=>{
    (async()=>{
      const ok = await fetch('/api/admin/analytics').then(r=>r.ok).catch(()=>false);
      setAuth(ok?'ok':'ng');
      if(ok){
        await Promise.all([reloadPosts(), reloadWords(), reloadSummary(), reloadFlags(), reloadTopics(), reloadLogs()]);
        try { const j = await fetch('/api/admin/notes').then(r=>r.json()); if(j?.ok) setNotes(j.notes); } catch {}
      }
    })();
  },[]);

  async function login(e: React.FormEvent){
    e.preventDefault();
    const r = await fetch('/api/auth', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ adminKey }) });
    if(r.ok){ setAuth('ok'); await Promise.all([reloadPosts(), reloadWords(), reloadSummary(), reloadFlags()]); }
    else alert('認証に失敗しました');
  }
  async function logout(){ await fetch('/api/auth?logout=1'); location.reload(); }

  async function reloadPosts(){ const params = new URLSearchParams(); if(query) params.set('q', query); if(handleFilter) params.set('handle', handleFilter); if(dateFilter) params.set('date', dateFilter); if(sourceFilter.length) params.set('source', sourceFilter.join(',')); const j = await fetch('/api/admin/posts/list?'+params.toString()).then(r=>r.json()).catch(()=>({posts:[]})); const arr = Array.isArray(j.posts)? j.posts as Post[]:[]; setPosts(arr); })); const arr = Array.isArray(j.posts)? j.posts as Post[]:[]; setPosts(arr); }
  async function reloadWords(){ const j = await fetch('/api/admin/ngwords').then(r=>r.json()).catch(()=>({words:[]})); setWords(Array.isArray(j.words)?j.words:[]); }
  async function reloadSummary(){ const j = await fetch('/api/admin/analytics').then(r=>r.json()).catch(()=>null); setSummary(j?.summary||null); }
  async function reloadFlags(){ const j = await fetch('/api/admin/moderation/scan').then(r=>r.json()).catch(()=>({items:[]})); setFlags(Array.isArray(j.items)?j.items:[]); }
  async function reloadTopics(){ const j = await fetch('/api/admin/auto-topics').then(r=>r.json()).catch(()=>null); setTopics(Array.isArray(j?.topics)? j.topics: []); }
  async function reloadLogs(){ const j = await fetch('/api/admin/auto-topics/logs?n=200').then(r=>r.json()).catch(()=>null); setLogs(Array.isArray(j?.lines)? j.lines: []); }
  async function addTopic(){ const kw = newTopic.trim(); if(!kw) return; const r = await fetch('/api/admin/auto-topics', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ keyword: kw, minIntervalMinutes: newTopicMin }) }); if(r.ok){ setNewTopic(''); await reloadTopics(); } }
  async function removeTopic(id:string, keyword:string){ const params = new URLSearchParams(); params.set('id', id); params.set('keyword', keyword); const r = await fetch('/api/admin/auto-topics?'+params.toString(), { method:'DELETE' }); if(r.ok){ await reloadTopics(); } }
  async function clearLogs(){ const r = await fetch('/api/admin/auto-topics/logs', { method:'DELETE' }); if(r.ok){ await reloadLogs(); } }

  async function bulk(action:'hide'|'publish'|'delete'){
    if(selected.size===0){ alert('対象がありません'); return; }
    if(action==='delete' && !confirm('選択した投稿を削除します。よろしぁE��すか�E�E)) return;
    const ids = Array.from(selected);
    const r = await fetch('/api/admin/posts/bulk', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action, ids }) });
    if(r.ok){ await reloadPosts(); setSelected(new Set()); }
    else alert('一括処琁E��失敗しました');
  }
  async function addWord(){ if(!newWord.trim()) return; const r= await fetch('/api/admin/ngwords', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'add', word:newWord.trim() }) }); if(r.ok){ setNewWord(''); await reloadWords(); } }
  async function removeWord(w:string){ const r= await fetch('/api/admin/ngwords', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'remove', word:w }) }); if(r.ok){ await reloadWords(); } }
  async function rescan(){
    try{
      setScanning(true);
      const r = await fetch('/api/admin/moderation/scan', { method:'POST' });
      if(r.ok){ await reloadFlags(); }
      else alert('スキャンに失敁E);
    } finally { setScanning(false); }
  }

  const filtered = useMemo(()=>{
    if(!query) return posts;
    const q = query.toLowerCase();
    return posts.filter(p => (p.title||'').toLowerCase().includes(q) || (p.comment||'').toLowerCase().includes(q) || (p.url||'').toLowerCase().includes(q));
  },[posts, query]);

  const ev = summary?.events || {};
  const evToday = summary?.eventsToday || {};
  const evMax = Math.max(ev.view||0, ev.empathy||0, ev.share||0, 1);

  if(auth!=='ok'){
    return (
      <main className="container" style={{maxWidth:560, padding:16}}>
        <h1 className="title">管琁E��グイン</h1>
        <form onSubmit={login} className="card" style={{padding:16, marginTop:12}}>
          <label className="radio">管琁E��ー
            <input type="password" value={adminKey} onChange={e=>setAdminKey(e.currentTarget.value)} style={{ width:'100%', padding:10, borderRadius:10, border:'1px solid var(--line)', background:'#fff', color:'#111' }} />
          </label>
          <div className="modal-actions" style={{marginTop:12}}>
            <button className="btn primary" type="submit">ログイン</button>
          </div>
        </form>
        <p style={{marginTop:12}}><Link href="/">サイトに戻めE/Link></p>
      </main>
    );
  }

  return (
    <main className="container" style={{padding:16}}>
      <header className="site-header" style={{position:'static', marginBottom:12}}>
        <div className="site-brand"><h1 className="brand-title">管琁E��ンソール</h1></div>
      </header>

      {/* 概要E*/}
      <section className="card" style={{padding:12}}>
        <h2 className="title">ダチE��ュボ�EチE/h2>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:8}}>
          <div className="notice"><div className="notice-title">総投稿</div><div>{summary?.postsTotal ?? posts.length}</div></div>
          <div className="notice"><div className="notice-title">非�E閁E/div><div>{summary?.postsHidden ?? 0}</div></div>
          <div className="notice"><div className="notice-title">イベント（累計！E/div><div>view:{summary?.events?.view||0} empathy:{summary?.events?.empathy||0} share:{summary?.events?.share||0}</div></div>
          <div className="notice"><div className="notice-title">今日</div><div>view:{summary?.eventsToday?.view||0} empathy:{summary?.eventsToday?.empathy||0} share:{summary?.eventsToday?.share||0}</div></div>
          <div style={{marginLeft:'auto'}}><button className="btn" onClick={logout}>ログアウチE/button></div>
        </div>
      </section>

      {/* 投稿一覧�E�E��括操佁E*/}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">投稿管琁E/h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input placeholder="検索" value={query} onChange={e=>setQuery(e.currentTarget.value)} style={{flex:1, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <button className="btn" onClick={()=>bulk('hide')}>非�E閁E/button>
          <button className="btn" onClick={()=>bulk('publish')}>再�E閁E/button>
          <button className="btn" onClick={()=>bulk('delete')}>削除</button>
          <button className="btn" onClick={()=>{ const s=new Set(selected); filtered.forEach(p=>s.add(p.id)); setSelected(s); }}>絞込を�E選抁E/button>
          <button className="btn" onClick={()=>setSelected(new Set())}>選択解除</button>
          <button className="btn" onClick={()=>{ const data = JSON.stringify(filtered, null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'posts.json'; a.click(); URL.revokeObjectURL(a.href); }}>JSON書き�EぁE/button>
        </div>
        <div style={{marginTop:8}}>
          {filtered.map(p=> (
            <div key={p.id} className="notice" style={{display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8, alignItems:'center'}}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={(e)=>{ const s=new Set(selected); if(e.currentTarget.checked) s.add(p.id); else s.delete(p.id); setSelected(s); }} />
              <div>
                <div style={{fontWeight:700}}>{p.title || p.url}</div>
                <div style={{fontSize:12, color:'var(--muted)'}}>{p.url}</div>
              </div>
              <div style={{display:'flex', gap:6, alignItems:'center'}}>
                <span className="pill">{p.is_published===0?'非�E閁E:'公閁E}</span>
                <button className="btn" onClick={()=>bulk('hide').then(()=>{})} title="非�E開にする" disabled={!selected.has(p.id)} style={{display:'none'}} />
                <button className="btn" onClick={()=>{ setSelected(new Set([p.id])); bulk('hide'); }}>非�E閁E/button>
                <button className="btn" onClick={()=>{ setSelected(new Set([p.id])); bulk('publish'); }}>再�E閁E/button>
                <button className="btn" onClick={()=>{ setSelected(new Set([p.id])); bulk('delete'); }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NGワード管琁E*/}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">NGワード管琁E/h2>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', marginBottom:6, color:'var(--muted)'}}>
          <span>現在 {words.length} 件</span>
          <button className="btn" onClick={async()=>{ const r=await fetch('/api/admin/ngwords/seed', { method:'POST' }); const j = await r.json().catch(()=>null); if(j?.ok){ await reloadWords(); alert(`初期セチE��を投入しました�E�合訁E${j.words?.length||0} 件�E�`); } else { alert('投�Eに失敗しました'); } }}>基準セチE��を投入</button>
        </div>
        <div style={{display:'flex', gap:8}}>
          <input value={newWord} onChange={e=>setNewWord(e.currentTarget.value)} placeholder="NGワードを追加" style={{flex:1, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <button className="btn" onClick={addWord}>追加</button>
        </div>
        <div style={{marginTop:8, display:'flex', gap:8}}>
          <input id="ngtest" placeholder="チE��ストで判定テスチE style={{flex:1, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <button className="btn" onClick={async()=>{
            const el = document.getElementById('ngtest') as HTMLInputElement|null; const text = el?.value||'';
            const r = await fetch('/api/admin/ngwords/test', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ text }) });
            const j = await r.json().catch(()=>null); alert(j?.blocked ? 'ブロチE��対象' : 'OK');
          }}>チE��チE/button>
        </div>
        <div style={{marginTop:8}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>#</th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>NGワーチE/th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>操佁E/th>
              </tr>
            </thead>
            <tbody>
              {words.map((w,i)=> (
                <tr key={`${i}-${w}`}>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{i+1}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{w}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>
                    <button className="btn" onClick={()=>removeWord(w)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 自動トピック�E�EouTube検索キーワード！E*/}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">自動トピック管琁E��EouTube検索�E�E/h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input value={newTopic} onChange={e=>setNewTopic(e.currentTarget.value)} placeholder="キーワードを追加 (侁E 外国人犯罪)" style={{flex:1, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <input type="number" value={newTopicMin} onChange={e=>setNewTopicMin(Number(e.currentTarget.value||60))} min={10} max={1440} style={{width:120, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <span style={{color:'var(--muted)'}}>刁E��隁E/span>
          <button className="btn" onClick={addTopic}>追加</button>
        </div>
        <div style={{marginTop:8}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>#</th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>キーワーチE/th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>間隔(刁E</th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>操佁E/th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t,i)=> (
                <tr key={t.id}>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{i+1}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{t.keyword}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{t.minIntervalMinutes}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>
                    <button className="btn" onClick={()=>removeTopic(t.id, t.keyword)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 自動投稿ログ */}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">自動投稿ログ</h2>
        <div className="modal-actions" style={{marginBottom:8}}>
          <button className="btn" onClick={reloadLogs}>再読込</button>
          <button className="btn" onClick={clearLogs}>クリア</button>
        </div>
        <pre style={{whiteSpace:'pre-wrap', background:'#111', color:'#eee', padding:8, borderRadius:8, maxHeight:240, overflow:'auto'}}>{logs.join('\n')}</pre>
      </section>

      {/* アンチ投稿スキャン */}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">アンチ投稿 自動判宁E/h2>
        <div className="modal-actions" style={{marginBottom:8}}>
          <button className="btn" type="button" onClick={rescan} aria-busy={scanning} disabled={scanning}>{scanning ? '実行中…' : 'スキャン実衁E}</button>
        </div>
        <div>
          {flags.map(f => (
            <div key={f.id} className="notice" style={{display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8}}>
              <span className="pill">score:{f.score}</span>
              <div>
                <div style={{fontWeight:700}}>{f.title || f.url}</div>
                <div style={{fontSize:12, color:'var(--muted)'}}>{(f.comment||'').slice(0,120)}</div>
              </div>
              <span>{new Date(f.created_at||Date.now()).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <footer style={{marginTop:16}}><Link href="/">サイトに戻めE/Link></footer>
    </main>
  );
}

