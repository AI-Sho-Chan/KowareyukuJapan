'use client';

import { useState, useEffect } from 'react';

interface FeedSource {
  id: string;
  name: string;
  url: string;
  type: string;
  category: string;
  enabled: number;
  check_interval_min: number;
  last_checked_at: number | null;
  error_count: number;
  config_json: string | null;
}

interface FeedLog {
  id: string;
  source_id: string;
  items_found: number;
  items_new: number;
  duration_ms: number;
  error: string | null;
  created_at: number;
}

export default function AdminFeedsPage() {
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [stats, setStats] = useState<{ posted: Record<string, number>; collected: Record<string, number> }>({ posted: {}, collected: {} });

  // フィード一覧取征E
  const loadFeeds = async () => {
    try {
      const res = await fetch('/api/admin/feeds');
      if (res.ok) {
        const data = await res.json();
        \n      try { const s = await fetch('/api/admin/feeds/stats').then(r=>r.json()); if (s?.ok) setStats({ posted: s.posted||{}, collected: s.collected||{} }); } catch {}
    } catch (error) {
      console.error('Failed to load feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  // フィードログ取征E
  const loadLogs = async (feedId?: string) => {
    try {
      const url = feedId 
        ? `/api/admin/feeds/logs?source_id=${feedId}`
        : '/api/admin/feeds/logs';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  useEffect(() => {
    loadFeeds();
    loadLogs();
  }, []);

  // フィード追加
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      const res = await fetch('/api/admin/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          url: formData.get('url'),
          type: formData.get('type') || 'rss',
          category: formData.get('category') || 'news',
          check_interval_min: parseInt(formData.get('interval') as string) || 30,
        }),
      });
      
      if (res.ok) {
        await loadFeeds();
        setShowAddForm(false);
        form.reset();
      }
    } catch (error) {
      console.error('Failed to add feed:', error);
      alert('フィード�E追加に失敗しました');
    }
  };

  // フィード有効/無効刁E��替ぁE
  const toggleFeed = async (feedId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      if (res.ok) {
        await loadFeeds();
      }
    } catch (error) {
      console.error('Failed to toggle feed:', error);
    }
  };

  // フィード削除
  const deleteFeed = async (feedId: string) => {
    if (!confirm('こ�Eフィードを削除しますか�E�E)) return;
    
    try {
      const res = await fetch(`/api/admin/feeds/${feedId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        await loadFeeds();
      }
    } catch (error) {
      console.error('Failed to delete feed:', error);
    }
  };

  // 手動実衁E
  const runFeedCheck = async () => {
    if (!confirm('フィードチェチE��を手動実行しますか�E�E)) return;
    
    try {
      const res = await fetch('/api/cron/feed-check', { method: 'POST' });
      if (res.ok) {
        alert('フィードチェチE��を開始しました');
        setTimeout(() => {
          loadFeeds();
          loadLogs();
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to run feed check:', error);
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <h1>フィード管琁E/h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h1>フィード管琁E/h1>
      
      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          新規フィード追加
        </button>
        <button 
          onClick={runFeedCheck}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          手動実衁E
        </button>
        <button 
          onClick={() => { loadFeeds(); loadLogs(); }}
          style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          更新
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddFeed} style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <h3>新規フィード追加</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <input name="name" placeholder="フィード名" required style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <input name="url" type="url" placeholder="フィードURL" required style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <select name="type" style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}>
              <option value="rss">RSS</option>
              <option value="atom">Atom</option>
              <option value="json">JSON Feed</option>
            </select>
            <input name="category" placeholder="カチE��リー" style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <input name="interval" type="number" placeholder="チェチE��間隔�E��E�E�E defaultValue="30" style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>追加</button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>キャンセル</button>
            </div>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div>
          <h2>フィード一覧</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>名前</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>カチE��リー</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>状慁E/th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>エラー</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>最終チェチE��</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>操佁E/th>
              </tr>
            </thead>
            <tbody>
              {feeds.map(feed => (
                <tr key={feed.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: 10 }}>
                    <div>{feed.name}</div>
                    <small style={{ color: '#6c757d' }}>{feed.url}</small>
                  </td>
                  <td style={{ padding: 10 }}>{feed.category}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: 4, 
                      background: feed.enabled ? '#28a745' : '#dc3545',
                      color: 'white',
                      fontSize: 12
                    }}>
                      {feed.enabled ? '有効' : '無効'}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}><div style={{ fontSize: 12, color: '#333' }}>posted: {stats.posted[feed.id] || 0} / collected: {stats.collected[feed.id] || 0}</div></td>
                  <td style={{ padding: 10 }}>
                    {feed.last_checked_at 
                      ? new Date(feed.last_checked_at * 1000).toLocaleString('ja-JP')
                      : '未実衁E}
                  </td>
                  <td style={{ padding: 10 }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button 
                        onClick={() => toggleFeed(feed.id, !feed.enabled)}
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: 12,
                          background: feed.enabled ? '#ffc107' : '#28a745',
                          color: feed.enabled ? '#000' : '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        {feed.enabled ? '無効匁E : '有効匁E}
                      </button>
                      <button 
                        onClick={() => { setSelectedFeed(feed.id); loadLogs(feed.id); }}
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: 12,
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
                      >
                        ログ
                      </button>
                      <button 
                        onClick={() => deleteFeed(feed.id)}
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: 12,
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer'
                        }}
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
          <h2>最近�Eログ</h2>
          <div style={{ maxHeight: 500, overflow: 'auto' }}>
            {logs.map(log => (
              <div key={log.id} style={{ 
                padding: 10, 
                marginBottom: 10, 
                background: log.error ? '#fff3cd' : '#d4edda',
                borderRadius: 4,
                border: `1px solid ${log.error ? '#ffc107' : '#28a745'}`
              }}>
                <div style={{ fontSize: 12, color: '#6c757d' }}>
                  {new Date(log.created_at * 1000).toLocaleString('ja-JP')}
                </div>
                <div>
                  取征E {log.items_found}件 / 新要E {log.items_new}件
                </div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>
                  処琁E��閁E {log.duration_ms}ms
                </div>
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
    </div>
  );
}


