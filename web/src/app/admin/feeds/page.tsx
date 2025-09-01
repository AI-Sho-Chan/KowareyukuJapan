'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type FeedSource = {
  id: string;
  name: string;
  url: string;
  type?: string;
  category?: string;
  enabled?: number;
  check_interval_min?: number;
  last_checked_at?: number | null;
  error_count?: number;
  config_json?: string | null;
};
type FeedLog = { id:string; source_id:string; items_found?:number; items_new?:number; duration_ms?:number; error?:string|null; created_at:number; source_name?:string };

export default function AdminFeedsPage() {
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [stats, setStats] = useState<{ posted: Record<string, number>; collected: Record<string, number> }>({ posted: {}, collected: {} });

  async function loadFeeds(){
    try{
      const r = await fetch('/api/admin/feeds');
      if(r.ok){
        const j = await r.json();
        setFeeds(Array.isArray(j.feeds)? j.feeds: []);
        try{ const s = await fetch('/api/admin/feeds/stats').then(r=>r.json()); if(s?.ok) setStats({ posted: s.posted||{}, collected: s.collected||{} }); } catch{}
      }
    } finally{
      setLoading(false);
    }
  }

  async function loadLogs(feedId?: string){
    try{
      const url = feedId ? `/api/admin/feeds/logs?source_id=${feedId}` : '/api/admin/feeds/logs';
      const r = await fetch(url);
      if(r.ok){ const j = await r.json(); setLogs(Array.isArray(j.logs)? j.logs: []); }
    } catch{}
  }

  useEffect(()=>{ loadFeeds(); loadLogs(); },[]);

  async function handleAddFeed(e: React.FormEvent){
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const body = {
      name: String(fd.get('name')||''),
      url: String(fd.get('url')||''),
      type: String(fd.get('type')||'rss'),
      category: String(fd.get('category')||'news'),
      check_interval_min: parseInt(String(fd.get('interval')||'30'))||30,
    };
    const r = await fetch('/api/admin/feeds', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
    if(r.ok){ await loadFeeds(); setShowAddForm(false); form.reset(); }
    else alert('フィードの追加に失敗しました');
  }

  async function toggleFeed(feedId: string, enabled: boolean){
    const r = await fetch(`/api/admin/feeds/${feedId}`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ enabled }) });
    if(r.ok){ await loadFeeds(); }
  }

  async function deleteFeed(feedId: string){
    if(!confirm('このフィードを削除しますか？')) return;
    const r = await fetch(`/api/admin/feeds/${feedId}`, { method:'DELETE' });
    if(r.ok){ await loadFeeds(); if(selectedFeed===feedId){ setSelectedFeed(null); await loadLogs(); } }
  }

  return (
    <main className="container" style={{ padding: 12 }}>
      <header className="card" style={{ padding: 12 }}>
        <h1 className="title">フィード管理</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <Link className="btn" href="/admin/console">コンソール</Link>
          <Link className="btn" href="/">サイトに戻る</Link>
        </div>
      </header>

      <section className="card" style={{ padding: 12, marginTop: 12 }}>
        <h2 className="title">新規フィード</h2>
        <div style={{ marginBottom: 12 }}>
          <button className="btn" onClick={()=>setShowAddForm(v=>!v)}>{showAddForm? '閉じる':'新規フィード追加'}</button>
        </div>
        {showAddForm && (
          <form onSubmit={handleAddFeed} style={{ display:'grid', gap:8, maxWidth:560 }}>
            <input name="name" placeholder="名前" required />
            <input name="url" placeholder="URL" required />
            <select name="type" defaultValue="rss">
              <option value="rss">RSS</option>
              <option value="youtube">YouTube</option>
              <option value="x">X (Twitter)</option>
            </select>
            <input name="category" placeholder="カテゴリー" defaultValue="news" />
            <input name="interval" placeholder="チェック間隔(分)" defaultValue="30" />
            <div className="modal-actions">
              <button className="btn primary" type="submit">追加</button>
            </div>
          </form>
        )}
      </section>

      <section className="card" style={{ padding: 12, marginTop: 12 }}>
        <h2 className="title">フィード一覧</h2>
        {loading ? (
          <div>読み込み中…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>#</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>名前</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>カテゴリー</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>状態</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>カウント</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>最終チェック</th>
                    <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {feeds.map((feed, idx) => (
                    <tr key={feed.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: 10 }}>{idx+1}</td>
                      <td style={{ padding: 10 }}>
                        <div>{feed.name}</div>
                        <small style={{ color: '#6c757d' }}>{feed.url}</small>
                      </td>
                      <td style={{ padding: 10 }}>{feed.category || '-'}</td>
                      <td style={{ padding: 10 }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: 4, 
                          background: (feed.enabled?1:0) ? '#28a745' : '#dc3545',
                          color: 'white',
                          fontSize: 12
                        }}>
                          {(feed.enabled?1:0) ? '有効' : '無効'}
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontSize: 12, color: '#333' }}>
                          posted: {stats.posted[feed.id] || 0} / collected: {stats.collected[feed.id] || 0}
                        </div>
                      </td>
                      <td style={{ padding: 10 }}>
                        {feed.last_checked_at ? new Date((feed.last_checked_at as number) * 1000).toLocaleString('ja-JP') : '未実行'}
                      </td>
                      <td style={{ padding: 10 }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button 
                            onClick={() => toggleFeed(feed.id, !(feed.enabled?1:0))}
                            style={{ padding: '4px 8px', fontSize: 12 }}
                          >
                            {(feed.enabled?1:0) ? '無効にする' : '有効にする'}
                          </button>
                          <button 
                            onClick={() => { setSelectedFeed(feed.id); loadLogs(feed.id); }}
                            style={{ padding: '4px 8px', fontSize: 12 }}
                          >
                            ログ
                          </button>
                          <button 
                            onClick={() => deleteFeed(feed.id)}
                            style={{ padding: '4px 8px', fontSize: 12, color:'#fff', background:'#dc3545', border:'none', borderRadius:4 }}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h2>最近のログ</h2>
              <div style={{ maxHeight: 500, overflow: 'auto' }}>
                {logs.map(log => (
                  <div key={log.id} style={{ padding: 10, marginBottom: 10, background: log.error ? '#fff3cd' : '#d4edda', borderRadius: 4, border: `1px solid ${log.error ? '#ffc107' : '#28a745'}` }}>
                    <div style={{ fontSize: 12, color: '#6c757d' }}>
                      {new Date(log.created_at * 1000).toLocaleString('ja-JP')} {log.source_name? `(${log.source_name})`:''}
                    </div>
                    <div>収集 {log.items_found||0}件 / 新規 {log.items_new||0}件</div>
                    <div style={{ fontSize: 12, color: '#6c757d' }}>所要 {log.duration_ms||0}ms</div>
                    {log.error && (
                      <div style={{ color: '#dc3545', fontSize: 12, marginTop: 5 }}>
                        エラー: {log.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

