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
    else alert('隱崎ｨｼ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
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
    if(selected.size===0){ alert('蟇ｾ雎｡縺後≠繧翫∪縺帙ｓ'); return; }
    if(action==='delete' && !confirm('驕ｸ謚槭＠縺滓兜遞ｿ繧貞炎髯､縺励∪縺吶ゅｈ繧阪＠縺・〒縺吶°・・)) return;
    const ids = Array.from(selected);
    const r = await fetch('/api/admin/posts/bulk', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action, ids }) });
    if(r.ok){ await reloadPosts(); setSelected(new Set()); }
    else alert('荳諡ｬ蜃ｦ逅・↓螟ｱ謨励＠縺ｾ縺励◆');
  }
  async function addWord(){ if(!newWord.trim()) return; const r= await fetch('/api/admin/ngwords', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'add', word:newWord.trim() }) }); if(r.ok){ setNewWord(''); await reloadWords(); } }
  async function removeWord(w:string){ const r= await fetch('/api/admin/ngwords', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ action:'remove', word:w }) }); if(r.ok){ await reloadWords(); } }
  async function rescan(){
    try{
      setScanning(true);
      const r = await fetch('/api/admin/moderation/scan', { method:'POST' });
      if(r.ok){ await reloadFlags(); }
      else alert('繧ｹ繧ｭ繝｣繝ｳ縺ｫ螟ｱ謨・);
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
        <h1 className="title">邂｡逅・Ο繧ｰ繧､繝ｳ</h1>
        <form onSubmit={login} className="card" style={{padding:16, marginTop:12}}>
          <label className="radio">邂｡逅・く繝ｼ
            <input type="password" value={adminKey} onChange={e=>setAdminKey(e.currentTarget.value)} style={{ width:'100%', padding:10, borderRadius:10, border:'1px solid var(--line)', background:'#fff', color:'#111' }} />
          </label>
          <div className="modal-actions" style={{marginTop:12}}>
            <button className="btn primary" type="submit">繝ｭ繧ｰ繧､繝ｳ</button>
          </div>
        </form>
        <p style={{marginTop:12}}><Link href="/">繧ｵ繧､繝医↓謌ｻ繧・/Link></p>
      </main>
    );
  }

  return (
    <main className="container" style={{padding:16}}>
      <header className="site-header" style={{position:'static', marginBottom:12}}>
        <div className="site-brand"><h1 className="brand-title">邂｡逅・さ繝ｳ繧ｽ繝ｼ繝ｫ</h1></div>
      </header>

      {/* 讎りｦ・*/}
      <section className="card" style={{padding:12}}>
        <h2 className="title">繝繝・す繝･繝懊・繝・/h2>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:8}}>
          <div className="notice"><div className="notice-title">邱乗兜遞ｿ</div><div>{summary?.postsTotal ?? posts.length}</div></div>
          <div className="notice"><div className="notice-title">髱槫・髢・/div><div>{summary?.postsHidden ?? 0}</div></div>
          <div className="notice"><div className="notice-title">繧､繝吶Φ繝茨ｼ育ｴｯ險茨ｼ・/div><div>view:{summary?.events?.view||0} empathy:{summary?.events?.empathy||0} share:{summary?.events?.share||0}</div></div>
          <div className="notice"><div className="notice-title">莉頑律</div><div>view:{summary?.eventsToday?.view||0} empathy:{summary?.eventsToday?.empathy||0} share:{summary?.eventsToday?.share||0}</div></div>
          <div style={{marginLeft:'auto'}}><button className="btn" onClick={logout}>繝ｭ繧ｰ繧｢繧ｦ繝・/button></div>
        </div>
      </section>

      {/* 謚慕ｨｿ荳隕ｧ・・ｸ諡ｬ謫堺ｽ・*/}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">謚慕ｨｿ邂｡逅・/h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input placeholder="讀懃ｴ｢" value={query} onChange={e=>setQuery(e.currentTarget.value)} style={{flex:1, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <button className="btn" onClick={()=>bulk('hide')}>髱槫・髢・/button>
          <button className="btn" onClick={()=>bulk('publish')}>蜀榊・髢・/button>
          <button className="btn" onClick={()=>bulk('delete')}>蜑企勁</button>
          <button className="btn" onClick={()=>{ const s=new Set(selected); filtered.forEach(p=>s.add(p.id)); setSelected(s); }}>邨櫁ｾｼ繧貞・驕ｸ謚・/button>
          <button className="btn" onClick={()=>setSelected(new Set())}>驕ｸ謚櫁ｧ｣髯､</button>
          <button className="btn" onClick={()=>{ const data = JSON.stringify(filtered, null, 2); const blob = new Blob([data], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'posts.json'; a.click(); URL.revokeObjectURL(a.href); }}>JSON譖ｸ縺榊・縺・/button>
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
                <span className="pill">{p.is_published===0?'髱槫・髢・:'蜈ｬ髢・}</span>
                <button className="btn" onClick={()=>bulk('hide').then(()=>{})} title="髱槫・髢九↓縺吶ｋ" disabled={!selected.has(p.id)} style={{display:'none'}} />
                <button className="btn" onClick={()=>{ setSelected(new Set([p.id])); bulk('hide'); }}>髱槫・髢・/button>
                <button className="btn" onClick={()=>{ setSelected(new Set([p.id])); bulk('publish'); }}>蜀榊・髢・/button>
                <button className="btn" onClick={()=>{ setSelected(new Set([p.id])); bulk('delete'); }}>蜑企勁</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NG繝ｯ繝ｼ繝臥ｮ｡逅・*/}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">NG繝ｯ繝ｼ繝臥ｮ｡逅・/h2>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', marginBottom:6, color:'var(--muted)'}}>
          <span>迴ｾ蝨ｨ {words.length} 莉ｶ</span>
          <button className="btn" onClick={async()=>{ const r=await fetch('/api/admin/ngwords/seed', { method:'POST' }); const j = await r.json().catch(()=>null); if(j?.ok){ await reloadWords(); alert(`蛻晄悄繧ｻ繝・ヨ繧呈兜蜈･縺励∪縺励◆・亥粋險・${j.words?.length||0} 莉ｶ・荏); } else { alert('謚募・縺ｫ螟ｱ謨励＠縺ｾ縺励◆'); } }}>蝓ｺ貅悶そ繝・ヨ繧呈兜蜈･</button>
        </div>
        <div style={{display:'flex', gap:8}}>
          <input value={newWord} onChange={e=>setNewWord(e.currentTarget.value)} placeholder="NG繝ｯ繝ｼ繝峨ｒ霑ｽ蜉" style={{flex:1, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <button className="btn" onClick={addWord}>霑ｽ蜉</button>
        </div>
        <div style={{marginTop:8, display:'flex', gap:8}}>
          <input id="ngtest" placeholder="繝・く繧ｹ繝医〒蛻､螳壹ユ繧ｹ繝・ style={{flex:1, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <button className="btn" onClick={async()=>{
            const el = document.getElementById('ngtest') as HTMLInputElement|null; const text = el?.value||'';
            const r = await fetch('/api/admin/ngwords/test', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ text }) });
            const j = await r.json().catch(()=>null); alert(j?.blocked ? '繝悶Ο繝・け蟇ｾ雎｡' : 'OK');
          }}>繝・せ繝・/button>
        </div>
        <div style={{marginTop:8}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>#</th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>NG繝ｯ繝ｼ繝・/th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>謫堺ｽ・/th>
              </tr>
            </thead>
            <tbody>
              {words.map((w,i)=> (
                <tr key={`${i}-${w}`}>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{i+1}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{w}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>
                    <button className="btn" onClick={()=>removeWord(w)}>蜑企勁</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 閾ｪ蜍輔ヨ繝斐ャ繧ｯ・・ouTube讀懃ｴ｢繧ｭ繝ｼ繝ｯ繝ｼ繝会ｼ・*/}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">閾ｪ蜍輔ヨ繝斐ャ繧ｯ邂｡逅・ｼ・ouTube讀懃ｴ｢・・/h2>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <input value={newTopic} onChange={e=>setNewTopic(e.currentTarget.value)} placeholder="繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ霑ｽ蜉 (萓・ 螟門嵜莠ｺ迥ｯ鄂ｪ)" style={{flex:1, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <input type="number" value={newTopicMin} onChange={e=>setNewTopicMin(Number(e.currentTarget.value||60))} min={10} max={1440} style={{width:120, padding:8, border:'1px solid var(--line)', borderRadius:8}} />
          <span style={{color:'var(--muted)'}}>蛻・俣髫・/span>
          <button className="btn" onClick={addTopic}>霑ｽ蜉</button>
        </div>
        <div style={{marginTop:8}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>#</th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>繧ｭ繝ｼ繝ｯ繝ｼ繝・/th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>髢馴囈(蛻・</th>
                <th style={{textAlign:'left', padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>謫堺ｽ・/th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t,i)=> (
                <tr key={t.id}>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{i+1}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{t.keyword}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{t.minIntervalMinutes}</td>
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>
                    <button className="btn" onClick={()=>removeTopic(t.id, t.keyword)}>蜑企勁</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 閾ｪ蜍墓兜遞ｿ繝ｭ繧ｰ */}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">閾ｪ蜍墓兜遞ｿ繝ｭ繧ｰ</h2>
        <div className="modal-actions" style={{marginBottom:8}}>
          <button className="btn" onClick={reloadLogs}>蜀崎ｪｭ霎ｼ</button>
          <button className="btn" onClick={clearLogs}>繧ｯ繝ｪ繧｢</button>
        </div>
        <pre style={{whiteSpace:'pre-wrap', background:'#111', color:'#eee', padding:8, borderRadius:8, maxHeight:240, overflow:'auto'}}>{logs.join('\n')}</pre>
      </section>

      {/* 繧｢繝ｳ繝∵兜遞ｿ繧ｹ繧ｭ繝｣繝ｳ */}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">繧｢繝ｳ繝∵兜遞ｿ 閾ｪ蜍募愛螳・/h2>
        <div className="modal-actions" style={{marginBottom:8}}>
          <button className="btn" type="button" onClick={rescan} aria-busy={scanning} disabled={scanning}>{scanning ? '螳溯｡御ｸｭ窶ｦ' : '繧ｹ繧ｭ繝｣繝ｳ螳溯｡・}</button>
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

      <footer style={{marginTop:16}}><Link href="/">繧ｵ繧､繝医↓謌ｻ繧・/Link></footer>
    </main>
  );
}

