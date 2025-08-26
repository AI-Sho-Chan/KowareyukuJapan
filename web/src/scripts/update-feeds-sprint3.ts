import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as crypto from 'crypto';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function updateFeeds() {
  console.log('🔄 フィード設定を更新中...');

  try {
    // 1. Yahoo!ニュースを無効化
    await db.execute({
      sql: `UPDATE feed_sources SET enabled = 0, updated_at = ? WHERE id = 'yahoo-news-main'`,
      args: [Math.floor(Date.now() / 1000)]
    });
    console.log('✅ Yahoo!ニュースを無効化しました');

    // 2. 新しいカテゴリー体系に合わせて既存フィードを更新
    await db.execute({
      sql: `UPDATE feed_sources SET category = '保守メディア', updated_at = ? WHERE id = 'sankei-politics'`,
      args: [Math.floor(Date.now() / 1000)]
    });
    
    await db.execute({
      sql: `UPDATE feed_sources SET category = '主流メディア', updated_at = ? WHERE id = 'nhk-news'`,
      args: [Math.floor(Date.now() / 1000)]
    });
    
    console.log('✅ 既存フィードのカテゴリーを更新しました');

    // 3. 新しいニュースソースを追加
    const newFeeds = [
      {
        id: 'google-news-japan',
        name: 'Google ニュース - 日本',
        url: 'https://news.google.com/rss/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNRFZxYUdjU0FtcGhHZ0FQAQ?hl=ja&gl=JP&ceid=JP:ja',
        type: 'rss',
        category: '総合ニュース',
        check_interval_min: 30,
        config_json: JSON.stringify({ auto_approve: false })
      },
      {
        id: 'google-news-world',
        name: 'Google ニュース - 国際',
        url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtcGhHZ0pLVUNnQVAB?hl=ja&gl=JP&ceid=JP:ja',
        type: 'rss',
        category: '国際ニュース',
        check_interval_min: 60,
        config_json: JSON.stringify({ auto_approve: false })
      },
      {
        id: 'google-news-politics',
        name: 'Google ニュース - 政治',
        url: 'https://news.google.com/rss/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNRFZxYUdjU0FtcGhHZ0FQAQ/sections/CAQiSkNCQVNPZ29JTDIwdk1EVnhhR2NTQW1waEdnSlFVQ2dBUEFGSEhRb1pMeTkwWVdkekx6QjRNREpuT1hKaGRGOXFjRGhoYlRBcUFBLio?hl=ja&gl=JP&ceid=JP:ja',
        type: 'rss',
        category: '政治',
        check_interval_min: 30,
        config_json: JSON.stringify({ 
          auto_approve: false,
          keywords: ['保守', '積極財政', '国防', '憲法改正']
        })
      },
      {
        id: 'zakzak-news',
        name: '夕刊フジ ZAKZAK',
        url: 'https://www.zakzak.co.jp/rss/news/flash-n.xml',
        type: 'rss',
        category: '保守メディア',
        check_interval_min: 60,
        config_json: JSON.stringify({ 
          auto_approve: true,
          keywords: ['中国', '韓国', '外国人犯罪', '財務省']
        })
      },
      {
        id: 'epochtimes-japan',
        name: '大紀元時報',
        url: 'https://www.epochtimes.jp/rss',
        type: 'rss',
        category: '反中国共産党',
        check_interval_min: 60,
        config_json: JSON.stringify({ 
          auto_approve: true,
          keywords: ['中国共産党', '人権弾圧', 'ウイグル', '香港']
        })
      }
    ];

    for (const feed of newFeeds) {
      try {
        await db.execute({
          sql: `INSERT INTO feed_sources (
            id, name, url, type, category, enabled, 
            check_interval_min, config_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          args: [
            feed.id,
            feed.name,
            feed.url,
            feed.type,
            feed.category,
            feed.check_interval_min,
            feed.config_json,
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000)
          ]
        });
        console.log(`✅ 追加: ${feed.name}`);
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`⚠️ スキップ（既存）: ${feed.name}`);
        } else {
          throw error;
        }
      }
    }

    // 4. 運営投稿者を設定
    await db.execute({
      sql: `UPDATE posts SET owner_key = 'ADMIN_OPERATOR' WHERE owner_key = 'SYSTEM_FEED'`,
      args: []
    });
    console.log('✅ 運営投稿者を設定しました');

    console.log('\n📊 フィード更新完了！');
    
    // 更新後のフィード一覧を表示
    const feeds = await db.execute(`
      SELECT name, category, enabled, check_interval_min 
      FROM feed_sources 
      ORDER BY category, name
    `);
    
    console.log('\n現在のフィード一覧:');
    console.log('カテゴリー | 名前 | 状態 | 間隔');
    console.log('---------|------|------|------');
    
    for (const feed of feeds.rows) {
      const status = feed.enabled ? '✅' : '❌';
      console.log(`${feed.category} | ${feed.name} | ${status} | ${feed.check_interval_min}分`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

updateFeeds().catch(console.error);