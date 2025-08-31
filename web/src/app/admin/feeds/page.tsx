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

  // 繝輔ぅ繝ｼ繝我ｸ隕ｧ蜿門ｾ・
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

  // 繝輔ぅ繝ｼ繝峨Ο繧ｰ蜿門ｾ・
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

  // 繝輔ぅ繝ｼ繝芽ｿｽ蜉
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
      alert('繝輔ぅ繝ｼ繝峨・霑ｽ蜉縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    }
  };

  // 繝輔ぅ繝ｼ繝画怏蜉ｹ/辟｡蜉ｹ蛻・ｊ譖ｿ縺・
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

  // 繝輔ぅ繝ｼ繝牙炎髯､
  const deleteFeed = async (feedId: string) => {
    if (!confirm('縺薙・繝輔ぅ繝ｼ繝峨ｒ蜑企勁縺励∪縺吶°・・)) return;
    
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

  // 謇句虚螳溯｡・
  const runFeedCheck = async () => {
    if (!confirm('繝輔ぅ繝ｼ繝峨メ繧ｧ繝・け繧呈焔蜍募ｮ溯｡後＠縺ｾ縺吶°・・)) return;
    
    try {
      const res = await fetch('/api/cron/feed-check', { method: 'POST' });
      if (res.ok) {
        alert('繝輔ぅ繝ｼ繝峨メ繧ｧ繝・け繧帝幕蟋九＠縺ｾ縺励◆');
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
        <h1>繝輔ぅ繝ｼ繝臥ｮ｡逅・/h1>
        <p>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <h1>繝輔ぅ繝ｼ繝臥ｮ｡逅・/h1>
      
      <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          譁ｰ隕上ヵ繧｣繝ｼ繝芽ｿｽ蜉
        </button>
        <button 
          onClick={runFeedCheck}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          謇句虚螳溯｡・
        </button>
        <button 
          onClick={() => { loadFeeds(); loadLogs(); }}
          style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          譖ｴ譁ｰ
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddFeed} style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <h3>譁ｰ隕上ヵ繧｣繝ｼ繝芽ｿｽ蜉</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            <input name="name" placeholder="繝輔ぅ繝ｼ繝牙錐" required style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <input name="url" type="url" placeholder="繝輔ぅ繝ｼ繝蔚RL" required style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <select name="type" style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }}>
              <option value="rss">RSS</option>
              <option value="atom">Atom</option>
              <option value="json">JSON Feed</option>
            </select>
            <input name="category" placeholder="繧ｫ繝・ざ繝ｪ繝ｼ" style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <input name="interval" type="number" placeholder="繝√ぉ繝・け髢馴囈・亥・・・ defaultValue="30" style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>霑ｽ蜉</button>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
            </div>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div>
          <h2>繝輔ぅ繝ｼ繝我ｸ隕ｧ</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>蜷榊燕</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>繧ｫ繝・ざ繝ｪ繝ｼ</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>迥ｶ諷・/th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>繧ｨ繝ｩ繝ｼ</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>譛邨ゅメ繧ｧ繝・け</th>
                <th style={{ padding: 10, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>謫堺ｽ・/th>
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
                      {feed.enabled ? '譛牙柑' : '辟｡蜉ｹ'}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}><div style={{ fontSize: 12, color: '#333' }}>posted: {stats.posted[feed.id] || 0} / collected: {stats.collected[feed.id] || 0}</div></td>
                  <td style={{ padding: 10 }}>
                    {feed.last_checked_at 
                      ? new Date(feed.last_checked_at * 1000).toLocaleString('ja-JP')
                      : '譛ｪ螳溯｡・}
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
                        {feed.enabled ? '辟｡蜉ｹ蛹・ : '譛牙柑蛹・}
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
                        繝ｭ繧ｰ
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
                        蜑企勁
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2>譛霑代・繝ｭ繧ｰ</h2>
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
                  蜿門ｾ・ {log.items_found}莉ｶ / 譁ｰ隕・ {log.items_new}莉ｶ
                </div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>
                  蜃ｦ逅・凾髢・ {log.duration_ms}ms
                </div>
                {log.error && (
                  <div style={{ color: '#dc3545', fontSize: 12, marginTop: 5 }}>
                    繧ｨ繝ｩ繝ｼ: {log.error}
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


