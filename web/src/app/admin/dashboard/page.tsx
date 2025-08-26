'use client';
import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <main className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理ダッシュボード</h1>
        <p className="mt-2 text-gray-600">KowareyukuJapan システム管理センター</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* フィード管理 */}
        <Link href="/admin/feeds" className="block">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <svg className="h-8 w-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
              <h2 className="text-xl font-semibold">フィード管理</h2>
            </div>
            <p className="text-gray-600 mb-4">RSS/YouTube/X フィードの設定と管理</p>
            <div className="text-sm text-gray-500">
              • フィードの追加・編集・削除<br/>
              • 自動承認設定<br/>
              • エラー監視
            </div>
          </div>
        </Link>

        {/* 投稿管理 */}
        <Link href="/admin" className="block">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <svg className="h-8 w-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h2 className="text-xl font-semibold">投稿管理</h2>
            </div>
            <p className="text-gray-600 mb-4">記事の投稿・編集・削除</p>
            <div className="text-sm text-gray-500">
              • 手動投稿作成<br/>
              • 投稿の編集・削除<br/>
              • カテゴリ管理
            </div>
          </div>
        </Link>

        {/* 非表示投稿管理 */}
        <Link href="/admin/hidden-posts" className="block">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <svg className="h-8 w-8 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <h2 className="text-xl font-semibold">非表示投稿</h2>
            </div>
            <p className="text-gray-600 mb-4">非表示にした投稿の管理</p>
            <div className="text-sm text-gray-500">
              • 非表示投稿一覧<br/>
              • 再表示設定<br/>
              • 完全削除
            </div>
          </div>
        </Link>

        {/* システム状態 */}
        <div className="block">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <svg className="h-8 w-8 text-purple-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-xl font-semibold">システム状態</h2>
            </div>
            <p className="text-gray-600 mb-4">システムの稼働状況</p>
            <div className="text-sm text-gray-500">
              • データベース状態<br/>
              • Cronジョブ実行状況<br/>
              • エラーログ
            </div>
          </div>
        </div>

        {/* トレンド分析 */}
        <Link href="/trending" className="block">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <svg className="h-8 w-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h2 className="text-xl font-semibold">トレンド分析</h2>
            </div>
            <p className="text-gray-600 mb-4">人気記事とトレンド</p>
            <div className="text-sm text-gray-500">
              • リアルタイムトレンド<br/>
              • 週間ランキング<br/>
              • エンゲージメント分析
            </div>
          </div>
        </Link>

        {/* 手動実行ツール */}
        <div className="block">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <svg className="h-8 w-8 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h2 className="text-xl font-semibold">手動実行</h2>
            </div>
            <p className="text-gray-600 mb-4">Cronジョブの手動実行</p>
            <div className="space-y-2">
              <button 
                onClick={() => fetch('/api/cron/feed-check', { method: 'POST' }).then(() => alert('フィードチェックを実行しました'))}
                className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                → フィードチェック実行
              </button>
              <button 
                onClick={() => fetch('/api/cron/promote', { method: 'POST' }).then(() => alert('記事昇格を実行しました'))}
                className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                → 記事自動承認実行
              </button>
              <button 
                onClick={() => fetch('/api/cron/trending', { method: 'POST' }).then(() => alert('トレンド更新を実行しました'))}
                className="w-full text-left px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                → トレンド更新実行
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mt-8 bg-gray-100 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">開発者ツール</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="px-4 py-2 bg-white rounded hover:bg-gray-50">
            トップページへ
          </Link>
          <Link href="/api/ok" className="px-4 py-2 bg-white rounded hover:bg-gray-50">
            APIヘルスチェック
          </Link>
          <button 
            onClick={() => {
              if(confirm('本当にデータベースをリセットしますか？')) {
                alert('安全のため、手動で実行してください: node scripts/reset-db.mjs');
              }
            }}
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            DBリセット（要確認）
          </button>
        </div>
      </div>
    </main>
  );
}