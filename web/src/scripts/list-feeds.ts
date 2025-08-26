import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function listFeeds() {
  console.log('\n📊 全フィードソースの一覧\n');
  console.log('=' .repeat(100));
  
  try {
    const feeds = await db.execute({
      sql: `SELECT * FROM feed_sources ORDER BY category, name`,
      args: []
    });
    
    const categories = new Map<string, any[]>();
    
    // カテゴリー別に分類
    for (const feed of feeds.rows) {
      const category = feed.category as string || '未分類';
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(feed);
    }
    
    // カテゴリー別に表示
    for (const [category, categoryFeeds] of categories) {
      console.log(`\n📁 ${category}`);
      console.log('-'.repeat(100));
      
      for (const feed of categoryFeeds) {
        const status = feed.enabled ? '✅' : '❌';
        const name = String(feed.name).padEnd(40);
        const interval = String(feed.check_interval_min).padStart(3);
        const lastCheck = feed.last_checked_at 
          ? new Date(Number(feed.last_checked_at) * 1000).toLocaleString('ja-JP')
          : '未実行';
        const errorBadge = feed.error_count > 0 ? `⚠️ エラー:${feed.error_count}` : '';
        
        console.log(`${status} ${name} | ${interval}分間隔 | 最終: ${lastCheck} ${errorBadge}`);
      }
    }
    
    console.log('\n' + '='.repeat(100));
    
    // 統計情報
    const stats = {
      total: feeds.rows.length,
      enabled: feeds.rows.filter(f => f.enabled).length,
      disabled: feeds.rows.filter(f => !f.enabled).length,
      hasErrors: feeds.rows.filter(f => Number(f.error_count) > 0).length
    };
    
    console.log('\n📈 統計:');
    console.log(`  総数: ${stats.total} | 有効: ${stats.enabled} | 無効: ${stats.disabled} | エラー有: ${stats.hasErrors}`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

listFeeds().catch(console.error);