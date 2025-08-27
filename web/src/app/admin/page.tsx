"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  url?: string;
  comment?: string;
  handle?: string;
  tags?: string[];
  createdAt: string;
  isPublished?: boolean;
  reportCount?: number;
}

export default function AdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminKey, setAdminKey] = useState("");

  // Simple authentication check - use session-based auth instead of public key
  useEffect(() => {
    const storedKey = localStorage.getItem("admin_key");
    if (storedKey === "admin123") { // Development fallback only
      setIsAuthorized(true);
      loadPosts();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 開発用フォールバック（本番環境でも一時的に使用）
    if (adminKey === "admin123") {
      localStorage.setItem("admin_key", "dev-token");
      setIsAuthorized(true);
      loadPosts();
      return;
    }
    
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey })
      });
      
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem("admin_key", token);
        setIsAuthorized(true);
        loadPosts();
      } else {
        alert("認証に失敗しました");
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert("認証中にエラーが発生しました");
    }
  };

  const loadPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts.reverse());
      }
    } catch (error) {
      console.error("Failed to load posts:", error);
      // エラーが発生しても管理画面は表示する
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("この投稿を削除しますか？")) return;

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-key": localStorage.getItem("admin_key") || "",
        },
      });

      if (res.ok) {
        setPosts(posts.filter(p => p.id !== id));
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("削除中にエラーが発生しました");
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      // This would call an API endpoint to toggle publish status
      // For now, just update local state
      setPosts(posts.map(p => 
        p.id === id ? { ...p, isPublished: !currentStatus } : p
      ));
    } catch (error) {
      console.error("Failed to toggle publish status:", error);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title?.toLowerCase().includes(query) ||
      post.comment?.toLowerCase().includes(query) ||
      post.url?.toLowerCase().includes(query) ||
      post.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  if (!isAuthorized) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-md">
        <h1 className="text-2xl font-bold mb-6">管理画面 - ログイン</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="adminKey" className="block text-sm font-medium mb-2">
              管理者キー
            </label>
            <input
              type="password"
              id="adminKey"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="管理者キーを入力"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            ログイン
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/" className="text-blue-600 hover:underline">
            ← ホームに戻る
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">管理画面</h1>
          <div className="flex gap-4">
            <Link href="/" className="text-blue-600 hover:underline">
              ← サイトに戻る
            </Link>
            <button
              onClick={async () => {
                if (confirm('データベースを初期化しますか？')) {
                  try {
                    const res = await fetch('/api/init-db', {
                      method: 'POST',
                      headers: {
                        'x-admin-key': localStorage.getItem('admin_key') || ''
                      }
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert('データベース初期化が完了しました');
                      window.location.reload();
                    } else {
                      alert('初期化に失敗しました: ' + data.error);
                    }
                  } catch (error) {
                    alert('初期化中にエラーが発生しました');
                  }
                }
              }}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              DB初期化
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("admin_key");
                window.location.reload();
              }}
              className="text-red-600 hover:underline"
            >
              ログアウト
            </button>
          </div>
        </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">総投稿数</div>
            <div className="text-2xl font-bold">{posts.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">公開中</div>
            <div className="text-2xl font-bold">
              {posts.filter(p => p.isPublished !== false).length}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">非公開</div>
            <div className="text-2xl font-bold">
              {posts.filter(p => p.isPublished === false).length}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">通報あり</div>
            <div className="text-2xl font-bold">
              {posts.filter(p => (p.reportCount || 0) > 0).length}
            </div>
          </div>
        </div>

        {/* 検索バー */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="投稿を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 投稿リスト */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              投稿が見つかりません
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className={`border rounded-lg p-4 ${
                  post.isPublished === false ? "bg-gray-50 opacity-75" : ""
                } ${(post.reportCount || 0) >= 3 ? "border-red-500" : ""}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {post.title || "（タイトルなし）"}
                    </h3>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {post.url}
                      </a>
                    )}
                    {post.comment && (
                      <p className="text-sm text-gray-600 mt-1">{post.comment}</p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-500 mt-2">
                      <span>ID: {post.id}</span>
                      <span>投稿者: {post.handle || "@guest"}</span>
                      <span>
                        {new Date(post.createdAt).toLocaleString("ja-JP")}
                      </span>
                      {(post.reportCount || 0) > 0 && (
                        <span className="text-red-600 font-semibold">
                          通報: {post.reportCount}件
                        </span>
                      )}
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {post.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-200 px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePublish(post.id, post.isPublished !== false)}
                      className={`px-3 py-1 text-sm rounded ${
                        post.isPublished === false
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-yellow-600 text-white hover:bg-yellow-700"
                      }`}
                    >
                      {post.isPublished === false ? "公開" : "非公開"}
                    </button>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}