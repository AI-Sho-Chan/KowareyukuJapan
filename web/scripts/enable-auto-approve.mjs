import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  console.log('🔄 全フィードを自動承認に設定中...');
  
  try {
    // 全フィードのconfig_jsonを更新して自動承認を有効化
    const feeds = await db.execute(`
      SELECT id, name, config_json FROM feed_sources WHERE enabled = 1
    `);
    
    for (const feed of feeds.rows) {
      let config = {};
      try {
        config = feed.config_json ? JSON.parse(feed.config_json) : {};
      } catch {}
      
      config.auto_approve = true;
      
      await db.execute({
        sql: `UPDATE feed_sources SET config_json = ? WHERE id = ?`,
        args: [JSON.stringify(config), feed.id]
      });
      
      console.log(`✅ ${feed.name} - 自動承認を有効化`);
    }
    
    console.log('\n📊 設定完了！');
    console.log('今後取得される記事は自動的に投稿されます。');
    
    // 既存のpending記事も承認
    const pendingCount = await db.execute(`
      SELECT COUNT(*) as count FROM feed_items WHERE status = 'pending'
    `);
    
    console.log(`\n⏳ 保留中の記事: ${pendingCount.rows[0].count}件`);
    console.log('これらを承認するには: curl -X POST http://localhost:3000/api/cron/promote');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
})();