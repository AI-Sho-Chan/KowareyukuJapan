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
  const [query, setQuery] = useState('');
  const [handleFilter, setHandleFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [attachFilter, setAttachFilter] = useState<string[]>([]);
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

  async function reloadPosts(){
    const params = new URLSearchParams();
    if(query) params.set('q', query);
    if(handleFilter) params.set('handle', handleFilter);
    if(dateFilter) params.set('date', dateFilter);
    if(sourceFilter.length) params.set('source', sourceFilter.join(','));
    if(attachFilter.length) params.set('has', attachFilter.join(','));
    const url = '/api/admin/posts/list' + (params.toString() ? ('?'+params.toString()) : '');
    const j = await fetch(url).then(r=>r.json()).catch(()=>({posts:[]}));
    const arr = Array.isArray(j.posts)? j.posts as Post[]:[]; setPosts(arr);
  }
  async function reloadWords(){ const j = await fetch('/api/admin/ngwords').then(r=>r.json()).catch(()=>({words:[]})); setWords(Array.isArray(j.words)?j.words:[]); (window as any).__ngCounts = j.counts || {}; }
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
      else alert('繧ｹ繧ｭ繝｣繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    } finally { setScanning(false); }
  }

  const filtered = useMemo(()=>{
    if(!query) return posts;
    const q = query.toLowerCase();
    return posts.filter(p => (p.title||'').toLowerCase().includes(q) || (p.comment||'').toLowerCase().includes(q) || (p.url||'').toLowerCase().includes(q));
  },[posts, query]);

  const ev = summary?.events || {};
  const evToday = summary?.eventsToday || {};

  if(auth==='unknown') return <main className="container"><p>Loading窶ｦ</p></main>;
  if(auth==='ng') return (
    <main className="container" style={{maxWidth:640, margin:'0 auto', padding:20}}>
      <h1>邂｡逅・Ο繧ｰ繧､繝ｳ</h1>
      <form onSubmit={login} style={{display:'grid', gap:8}}>
        <input type="password" value={adminKey} onChange={e=>setAdminKey(e.currentTarget.value)} placeholder="Admin Key" />
        <button className="btn primary" type="submit">繝ｭ繧ｰ繧､繝ｳ</button>
      </form>
    </main>
  );

  return (
    <main className="container" style={{padding:12}}>
      <header className="card" style={{padding:12}}>
        <h1 className="title">邂｡逅・さ繝ｳ繧ｽ繝ｼ繝ｫ</h1>
        <div className="notice"><div className="notice-title">繧､繝吶Φ繝茨ｼ育ｴｯ險茨ｼ・/div><div>view:{ev.view||0} empathy:{ev.empathy||0} share:{ev.share||0}</div></div>
        <div className="notice"><div className="notice-title">莉頑律</div><div>view:{evToday.view||0} empathy:{evToday.empathy||0} share:{evToday.share||0}</div></div>
        <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
          <input value={query} onChange={e=>setQuery(e.currentTarget.value)} placeholder="讀懃ｴ｢ (繧ｿ繧､繝医Ν/繧ｳ繝｡繝ｳ繝・URL)" style={{flex:1}} />
          <button className="btn" onClick={logout}>繝ｭ繧ｰ繧｢繧ｦ繝・/button>
        </div>
      </header>

      {/* 謚慕ｨｿ荳隕ｧ */}
      <section className="card" style={{padding:12, marginTop:12}}>
        <h2 className="title">謚慕ｨｿ荳隕ｧ</h2>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 2fr auto', gap:8, marginBottom:8}}>
          <input placeholder="繝上Φ繝峨Ν蜷・(@荳崎ｦ・" value={handleFilter} onChange={e=>setHandleFilter(e.currentTarget.value)} />
          <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.currentTarget.value)} />
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            {['x','instagram','youtube','nhk','note','web'].map(s => (
              <label key={s} style={{fontSize:12}}>
                <input
                  type="checkbox"
                  checked={sourceFilter.includes(s)}
                  onChange={(e)=>{
                    const checked = (e.currentTarget as HTMLInputElement).checked;
                    setSourceFilter(prev => checked ? Array.from(new Set([...prev, s])) : prev.filter(x => x !== s));
                  }}
                /> {s}
              </label>
            ))}
          </div>
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            {[
              { key:'image', label:'逕ｻ蜒・ },
              { key:'video', label:'蜍慕判' },
              { key:'comment', label:'繧ｳ繝｡繝ｳ繝医≠繧・ },
            ].map(o => (
              <label key={o.key} style={{fontSize:12}}>
                <input type="checkbox" checked={attachFilter.includes(o.key)} onChange={e=>{
                  const checked = (e.currentTarget as HTMLInputElement).checked;
                  setAttachFilter(prev => checked ? Array.from(new Set([...prev, o.key])) : prev.filter(x => x !== o.key));
                }} /> {o.label}
              </label>
            ))}
          </div>
          <button className="btn" onClick={reloadPosts}>讀懃ｴ｢</button>
        </div>
        <div className="modal-actions" style={{marginBottom:8}}>
          <button className="btn" onClick={()=>bulk('publish')}>蜈ｬ髢・/button>
          <button className="btn" onClick={()=>bulk('hide')}>髱槫・髢・/button>
          <button className="btn" onClick={()=>bulk('delete')}>蜑企勁</button>
        </div>
        <div className="list">
          {filtered.map(p => (
            <div key={p.id} className="list-item" style={{display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8, alignItems:'center'}}>
              <input type="checkbox" checked={selected.has(p.id)} onChange={e=>{ const s=new Set(selected); if(e.currentTarget.checked) s.add(p.id); else s.delete(p.id); setSelected(s); }} />
              <div>
                <div style={{fontWeight:700}}>{p.title || p.url}</div>
                <div style={{fontSize:12, color:'var(--muted)'}}>{p.url}</div>
              </div>
              <div style={{display:'flex', gap:4}}>
                <span className="pill" title="蜈ｬ髢狗憾諷・>{p.is_published? '蜈ｬ髢・:'髱槫・髢・}</span>
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
          <button className="btn" onClick={async()=>{ const r=await fetch('/api/admin/ngwords/seed', { method:'POST' }); const j = await r.json().catch(()=>null); if(j?.ok){ await reloadWords(); alert(`蛻晄悄繧ｻ繝・ヨ繧呈兜蜈･縺励∪縺励◆・亥・菴・ ${j.words?.length||0} 莉ｶ・荏); } else { alert('謚募・縺ｫ螟ｱ謨励＠縺ｾ縺励◆'); } }}>蝓ｺ貅悶そ繝・ヨ繧呈兜蜈･</button>
        </div>
        <div style={{display:'flex', gap:8}}>
          <input value={newWord} onChange={e=>setNewWord(e.currentTarget.value)} placeholder="NG繝ｯ繝ｼ繝峨ｒ霑ｽ蜉" style={{flex:1}} />
          <button className="btn" onClick={addWord}>霑ｽ蜉</button>
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
                  <td style={{padding:'6px 8px', borderBottom:'1px solid var(--line)'}}>{w} {(window as any).__ngCounts && (window as any).__ngCounts[w] ? (被弾:) : ''}</td>
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

