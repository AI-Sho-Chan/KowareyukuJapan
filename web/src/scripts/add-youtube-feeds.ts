import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { YOUTUBE_CHANNELS } from '../lib/feed/youtube.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addYouTubeFeeds() {
  console.log('🔄 YouTubeチャンネルをフィードソースに追加中...');

  try {
    for (const channel of YOUTUBE_CHANNELS) {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
      const feedId = `youtube-${channel.id}`;
      
      try {
        await db.execute({
          sql: `INSERT INTO feed_sources (
            id, name, url, type, category, enabled, 
            check_interval_min, config_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          args: [
            feedId,
            `YouTube: ${channel.name}`,
            feedUrl,
            'rss', // YouTube RSSフィード
            'YouTube保守チャンネル',
            60, // 1時間ごとにチェック
            JSON.stringify({
              auto_approve: true,
              channel_id: channel.channelId,
              channel_name: channel.name,
              keywords: channel.keywords,
              max_per_hour: channel.maxPerHour,
              type: 'youtube'
            }),
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000)
          ]
        });
        console.log(`✅ 追加: ${channel.name}`);
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
          // 既存の場合は更新
          await db.execute({
            sql: `UPDATE feed_sources SET 
              url = ?, category = ?, config_json = ?, updated_at = ?
              WHERE id = ?`,
            args: [
              feedUrl,
              'YouTube保守チャンネル',
              JSON.stringify({
                auto_approve: true,
                channel_id: channel.channelId,
                channel_name: channel.name,
                keywords: channel.keywords,
                max_per_hour: channel.maxPerHour,
                type: 'youtube'
              }),
              Math.floor(Date.now() / 1000),
              feedId
            ]
          });
          console.log(`⚠️ 更新: ${channel.name}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n📊 YouTubeフィード追加完了！');
    
    // YouTube フィード一覧を表示
    const youtubeFeeds = await db.execute({
      sql: `SELECT name, url, enabled, check_interval_min 
            FROM feed_sources 
            WHERE id LIKE 'youtube-%'
            ORDER BY name`,
      args: []
    });
    
    console.log('\nYouTubeフィード一覧:');
    for (const feed of youtubeFeeds.rows) {
      const status = feed.enabled ? '✅' : '❌';
      console.log(`${status} ${feed.name} - ${feed.check_interval_min}分間隔`);
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

addYouTubeFeeds().catch(console.error);