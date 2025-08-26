import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  console.log('\n📊 フィードシステム診断\n');
  console.log('='.repeat(80));
  
  try {
    // 1. 有効なフィードを確認
    const feeds = await db.execute(`
      SELECT id, name, url, enabled, last_checked_at, error_count 
      FROM feed_sources 
      WHERE enabled = 1
    `);
    
    console.log('\n✅ 現在有効なフィード:');
    for (const feed of feeds.rows) {
      const lastCheck = feed.last_checked_at 
        ? new Date(Number(feed.last_checked_at) * 1000).toLocaleString('ja-JP')
        : '未実行';
      console.log(`  ${feed.name}`);
      console.log(`    URL: ${feed.url}`);
      console.log(`    最終チェック: ${lastCheck}`);
      console.log(`    エラー回数: ${feed.error_count || 0}`);
    }
    
    // 2. データ統計
    const stats = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM feed_sources WHERE enabled = 1) as active_feeds,
        (SELECT COUNT(*) FROM feed_items) as total_items,
        (SELECT COUNT(*) FROM feed_items WHERE status = 'pending') as pending_items,
        (SELECT COUNT(*) FROM feed_items WHERE status = 'approved') as approved_items,
        (SELECT COUNT(*) FROM posts) as total_posts,
        (SELECT COUNT(*) FROM posts WHERE owner_key = 'ADMIN_OPERATOR') as auto_posts
    `);
    
    const s = stats.rows[0];
    console.log('\n📈 データ統計:');
    console.log(`  有効フィード数: ${s.active_feeds}`);
    console.log(`  feed_items総数: ${s.total_items}`);
    console.log(`    - 保留中: ${s.pending_items}`);
    console.log(`    - 承認済み: ${s.approved_items}`);
    console.log(`  posts総数: ${s.total_posts}`);
    console.log(`    - 自動投稿: ${s.auto_posts}`);
    
    // 3. 最近のfeed_items
    const recentItems = await db.execute(`
      SELECT fi.title, fi.url, fi.created_at, fs.name as source_name
      FROM feed_items fi
      JOIN feed_sources fs ON fi.source_id = fs.id
      ORDER BY fi.created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📰 最近取得した記事:');
    for (const item of recentItems.rows) {
      const date = new Date(Number(item.created_at) * 1000).toLocaleString('ja-JP');
      console.log(`  [${item.source_name}] ${item.title}`);
      console.log(`    ${date}`);
    }
    
    // 4. 最近のposts
    const recentPosts = await db.execute(`
      SELECT title, url, owner_key, created_at
      FROM posts
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📝 最近の投稿:');
    for (const post of recentPosts.rows) {
      const date = new Date(post.created_at).toLocaleString('ja-JP');
      console.log(`  [${post.owner_key}] ${post.title}`);
      console.log(`    ${date}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 フィード更新方法:');
    console.log('  1. 手動でフィードチェック: curl -X POST http://localhost:3000/api/cron/feed-check');
    console.log('  2. 手動で自動承認: curl -X POST http://localhost:3000/api/cron/promote');
    console.log('  3. 管理画面でフィード管理: http://localhost:3000/admin/feeds');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
})();