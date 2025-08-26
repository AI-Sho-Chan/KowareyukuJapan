'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HiddenPost {
  id: string;
  title: string;
  url?: string;
  comment?: string;
  handle?: string;
  report_count: number;
  auto_hidden: boolean;
  auto_hidden_at?: string;
  created_at: string;
}

export default function HiddenPostsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState<HiddenPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<HiddenPost | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    // 管理者認証チェック
    const adminKey = sessionStorage.getItem('adminKey');
    if (adminKey !== process.env.NEXT_PUBLIC_ADMIN_KEY) {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);
    fetchHiddenPosts();
  }, [router]);

  const fetchHiddenPosts = async () => {
    try {
      const response = await fetch('/api/admin/hidden-posts', {
        headers: {
          'X-Admin-Key': sessionStorage.getItem('adminKey') || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch hidden posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRePublish = async (postId: string) => {
    if (!confirm('この投稿を再公開しますか？')) return;

    try {
      const response = await fetch(`/api/admin/posts/${postId}/republish`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': sessionStorage.getItem('adminKey') || '',
        },
      });

      if (response.ok) {
        setActionMessage('投稿を再公開しました');
        fetchHiddenPosts();
        setTimeout(() => setActionMessage(''), 3000);
      } else {
        setActionMessage('再公開に失敗しました');
      }
    } catch (error) {
      console.error('Failed to republish post:', error);
      setActionMessage('エラーが発生しました');
    }
  };

  const handleArchive = async (postId: string) => {
    if (!confirm('この投稿をアーカイブしますか？（復元不可）')) return;

    try {
      const response = await fetch(`/api/admin/posts/${postId}/archive`, {
        method: 'POST',
        headers: {
          'X-Admin-Key': sessionStorage.getItem('adminKey') || '',
        },
      });

      if (response.ok) {
        setActionMessage('投稿をアーカイブしました');
        fetchHiddenPosts();
        setTimeout(() => setActionMessage(''), 3000);
      } else {
        setActionMessage('アーカイブに失敗しました');
      }
    } catch (error) {
      console.error('Failed to archive post:', error);
      setActionMessage('エラーが発生しました');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">非公開投稿の管理</h1>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            管理画面に戻る
          </button>
        </div>

        {actionMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {actionMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            非公開の投稿はありません
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    投稿ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    タイトル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    報告数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    非公開理由
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    非公開日時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {post.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {post.title || '(無題)'}
                        </div>
                        {post.comment && (
                          <div className="text-gray-500 truncate max-w-xs">
                            {post.comment}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.report_count >= 10 
                          ? 'bg-red-100 text-red-800'
                          : post.report_count >= 3
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {post.report_count}件
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.auto_hidden ? (
                        <span className="text-red-600 font-medium">
                          自動非公開（報告{post.report_count}件）
                        </span>
                      ) : (
                        <span>管理者による非公開</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {post.auto_hidden_at 
                        ? formatDate(post.auto_hidden_at)
                        : formatDate(post.created_at)
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          詳細
                        </button>
                        <button
                          onClick={() => handleRePublish(post.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          再公開
                        </button>
                        <button
                          onClick={() => handleArchive(post.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          アーカイブ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 詳細モーダル */}
        {selectedPost && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-lg font-medium mb-4">投稿の詳細</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="font-medium text-gray-700">投稿ID:</label>
                  <p className="text-gray-900">{selectedPost.id}</p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">タイトル:</label>
                  <p className="text-gray-900">{selectedPost.title || '(無題)'}</p>
                </div>
                
                {selectedPost.url && (
                  <div>
                    <label className="font-medium text-gray-700">URL:</label>
                    <a 
                      href={selectedPost.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedPost.url}
                    </a>
                  </div>
                )}
                
                {selectedPost.comment && (
                  <div>
                    <label className="font-medium text-gray-700">コメント:</label>
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {selectedPost.comment}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="font-medium text-gray-700">投稿者:</label>
                  <p className="text-gray-900">{selectedPost.handle || '@guest'}</p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">報告数:</label>
                  <p className="text-gray-900">{selectedPost.report_count}件</p>
                </div>
                
                <div>
                  <label className="font-medium text-gray-700">投稿日時:</label>
                  <p className="text-gray-900">{formatDate(selectedPost.created_at)}</p>
                </div>
                
                {selectedPost.auto_hidden_at && (
                  <div>
                    <label className="font-medium text-gray-700">非公開日時:</label>
                    <p className="text-gray-900">{formatDate(selectedPost.auto_hidden_at)}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  閉じる
                </button>
                <button
                  onClick={() => {
                    handleRePublish(selectedPost.id);
                    setSelectedPost(null);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  再公開
                </button>
                <button
                  onClick={() => {
                    handleArchive(selectedPost.id);
                    setSelectedPost(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  アーカイブ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}