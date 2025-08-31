"use client";
import { useEffect, useState } from 'react';

export default function AdminLoginPage() {
  const [adminKey, setAdminKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // すでに認証済みならコンソールへリダイレクト
  useEffect(() => {
    (async () => {
      try {
        const ok = await fetch('/api/admin/analytics', { method: 'GET' })
          .then((r) => r.ok)
          .catch(() => false);
        if (ok) {
          window.location.replace('/admin/console');
        }
      } catch {}
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminKey }),
      });
      if (!res.ok) {
        setError('認証に失敗しました');
        return;
      }
      const url = new URL(window.location.href);
      const next = url.searchParams.get('next') || '/admin/console';
      window.location.href = next;
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 560, padding: 16 }}>
      <h1 className="title">管理ログイン</h1>
      <form onSubmit={onSubmit} className="card" style={{ padding: 16, marginTop: 12 }}>
        <label className="radio" style={{ display: 'block', marginBottom: 8 }}>管理キー</label>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.currentTarget.value)}
          placeholder={process.env.NEXT_PUBLIC_ADMIN_KEY ? '開発用の既定キーあり' : ''}
          style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: '#fff', color: '#111' }}
        />
        {error && (
          <div className="notice" style={{ marginTop: 8 }}>
            <div className="notice-title">エラー</div>
            <div>{error}</div>
          </div>
        )}
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn primary" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'ログイン中…' : 'ログイン'}
          </button>
        </div>
      </form>
      <p style={{ marginTop: 12 }}>
        <a href="/">サイトに戻る</a>
      </p>
    </main>
  );
}
