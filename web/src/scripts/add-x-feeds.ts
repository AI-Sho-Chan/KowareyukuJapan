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

async function addXFeeds() {
  console.log('🔄 X (Twitter)アカウントをフィードソースに追加中...');

  try {
    // 門田隆将のフィード
    const xAccounts = [
      {
        id: 'x-kadota-ryusho',
        name: 'X: 門田隆将',
        username: 'KadotaRyusho',
        displayName: '門田隆将',
        keywords: ['保守', 'ジャーナリスト', '中国問題'],
      }
    ];
    
    for (const account of xAccounts) {
      const feedId = account.id;
      
      try {
        await db.execute({
          sql: `INSERT INTO feed_sources (
            id, name, url, type, category, enabled, 
            check_interval_min, config_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          args: [
            feedId,
            account.name,
            `https://x.com/${account.username}`,
            'json', // X APIはJSONレスポンス
            'X保守アカウント',
            30, // 30分ごとにチェック
            JSON.stringify({
              auto_approve: true,
              username: account.username,
              display_name: account.displayName,
              keywords: account.keywords,
              max_per_30min: 1,
              type: 'twitter'
            }),
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000)
          ]
        });
        console.log(`✅ 追加: ${account.displayName} (@${account.username})`);
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
          // 既存の場合は更新
          await db.execute({
            sql: `UPDATE feed_sources SET 
              url = ?, category = ?, config_json = ?, updated_at = ?
              WHERE id = ?`,
            args: [
              `https://x.com/${account.username}`,
              'X保守アカウント',
              JSON.stringify({
                auto_approve: true,
                username: account.username,
                display_name: account.displayName,
                keywords: account.keywords,
                max_per_30min: 1,
                type: 'twitter'
              }),
              Math.floor(Date.now() / 1000),
              feedId
            ]
          });
          console.log(`⚠️ 更新: ${account.displayName} (@${account.username})`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n📊 X (Twitter)フィード追加完了！');
    
    // X フィード一覧を表示
    const xFeeds = await db.execute({
      sql: `SELECT name, url, enabled, check_interval_min, config_json
            FROM feed_sources 
            WHERE id LIKE 'x-%'
            ORDER BY name`,
      args: []
    });
    
    console.log('\nX (Twitter)フィード一覧:');
    for (const feed of xFeeds.rows) {
      const status = feed.enabled ? '✅' : '❌';
      const config = JSON.parse(feed.config_json as string);
      console.log(`${status} ${feed.name} (@${config.username}) - ${feed.check_interval_min}分間隔`);
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

addXFeeds().catch(console.error);