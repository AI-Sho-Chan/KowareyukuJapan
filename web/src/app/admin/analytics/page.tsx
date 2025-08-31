"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Summary = { postsTotal:number; postsHidden:number; events:Record<string,number>; eventsToday:Record<string,number> };

export default function AnalyticsPage(){
  const [summary, setSummary] = useState<Summary|null>(null);
  const [loading, setLoading] = useState(true);
  const ev = summary?.events || {};
  const max = Math.max(ev.view||0, ev.empathy||0, ev.share||0, 1);

  useEffect(()=>{ (async()=>{
    try{ const j = await fetch('/api/admin/analytics').then(r=>r.json()); setSummary(j?.summary||null); } finally { setLoading(false); }
  })(); },[]);

  return (
    <main className="container" style={{padding:16}}>
      <header className="site-header" style={{position:'static', marginBottom:12}}>
        <div className="site-brand"><h1 className="brand-title">アナリティクス</h1></div>
      </header>
      {loading ? (<div>読み込み中…</div>) : summary ? (
        <>
          <div className="card" style={{padding:12}}>
            <div className="notice"><div className="notice-title">総投稿</div><div>{summary.postsTotal}</div></div>
            <div className="notice" style={{marginTop:6}}><div className="notice-title">非公開</div><div>{summary.postsHidden}</div></div>
          </div>
          <section className="card" style={{padding:12, marginTop:12}}>
            <h2 className="title">イベント（累計）</h2>
            {['view','empathy','share'].map(k=> (
              <div key={k} style={{display:'grid', gridTemplateColumns:'80px 1fr 60px', alignItems:'center', gap:8, marginTop:6}}>
                <div style={{color:'var(--muted)', textAlign:'right'}}>{k}</div>
                <div style={{background:'#eee', height:8, borderRadius:4, overflow:'hidden'}}>
                  <div style={{width: `${Math.min(100, Math.round(((ev[k]||0)/max)*100))}%`, height:8, background:'#d33'}} />
                </div>
                <div style={{textAlign:'right'}}>{ev[k]||0}</div>
              </div>
            ))}
          </section>
        </>
      ) : (<div className="card" style={{padding:12}}>データがありません</div>)}

      <footer style={{marginTop:16}}><Link href="/admin/console">管理コンソールに戻る</Link></footer>
    </main>
  );
}

