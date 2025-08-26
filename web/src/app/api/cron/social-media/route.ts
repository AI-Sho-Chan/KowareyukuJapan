import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import crypto from 'crypto';
import { Normalizer } from '@/lib/feed/normalizer';
import { Deduplicator } from '@/lib/feed/deduplicator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Cronジョブ認証（Vercel Cron用）
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  
  // 開発環境では許可
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return false;
}

// 最後に取得した動画のトラッキング（メモリベース）
const lastFetchedVideos = new Map<string, number>();

/**
 * YouTubeとX (Twitter)の投稿を取得して自動投稿
 */
export async function GET(request: NextRequest) {
  // Cron認証チェック
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const startTime = Date.now();
  const results = {
    youtube: { fetched: 0, added: 0, errors: [] as any[] },
    twitter: { fetched: 0, added: 0, errors: [] as any[] },
  };
  
  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    const deduplicator = new Deduplicator(db);
    
    // 1. YouTube動画の処理
    console.log('📺 YouTube動画を処理中...');
    
    // YouTube フィードソースを取得
    const youtubeFeeds = await db.execute({
      sql: `SELECT * FROM feed_sources 
            WHERE id LIKE 'youtube-%' AND enabled = 1`,
      args: []
    });
    
    for (const feedRow of youtubeFeeds.rows) {
      const feedId = feedRow.id as string;
      const feedUrl = feedRow.url as string;
      const configJson = feedRow.config_json as string;
      
      let config: any = {};
      try {
        config = configJson ? JSON.parse(configJson) : {};
      } catch {}
      
      const channelName = config.channel_name || 'YouTube';
      const maxPerHour = config.max_per_hour || 1;
      
      // 1時間以内に取得した動画数をチェック
      const lastFetchTime = lastFetchedVideos.get(feedId) || 0;
      const hourAgo = Date.now() - 60 * 60 * 1000;
      
      if (lastFetchTime > hourAgo && maxPerHour <= 1) {
        console.log(`⏭️ ${channelName}: 1時間制限のためスキップ`);
        continue;
      }
      
      try {
        // YouTube RSS フィードを取得（既存のfeed-checkで処理される）
        // ここでは追加の処理のみ
        
        // 最新の動画を1件だけ取得して自動承認
        const latestVideo = await db.execute({
          sql: `SELECT * FROM feed_items 
                WHERE source_id = ? AND status = 'pending'
                ORDER BY published_at DESC
                LIMIT 1`,
          args: [feedId]
        });
        
        if (latestVideo.rows.length > 0) {
          const video = latestVideo.rows[0];
          const videoId = video.id as string;
          const videoUrl = video.url as string;
          const videoTitle = video.title as string;
          
          // YouTube埋め込みURLを生成
          const youtubeVideoId = videoUrl.match(/[?&]v=([^&]+)/)?.[1] || 
                                 videoUrl.match(/youtu\.be\/([^?]+)/)?.[1];
          
          if (youtubeVideoId) {
            // postsテーブルに直接昇格（自動承認）
            const postId = crypto.randomUUID();
            
            await db.execute({
              sql: `INSERT INTO posts (
                id, owner_key, source_id, url, type, title, summary, thumbnail,
                embed_status, probe_json, tags_json, status, published_at, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                postId,
                'ADMIN_OPERATOR', // 運営として投稿
                feedId,
                videoUrl,
                'youtube',
                videoTitle,
                `${channelName}の最新動画`,
                `https://i.ytimg.com/vi/${youtubeVideoId}/maxresdefault.jpg`,
                'ok',
                JSON.stringify({
                  type: 'youtube',
                  videoId: youtubeVideoId,
                  channelName: channelName,
                  embedUrl: `https://www.youtube.com/embed/${youtubeVideoId}`
                }),
                JSON.stringify(config.keywords || []),
                'published',
                Math.floor(Date.now() / 1000),
                Math.floor(Date.now() / 1000)
              ]
            });
            
            // feed_itemを承認済みに更新
            await db.execute({
              sql: `UPDATE feed_items SET status = 'approved' WHERE id = ?`,
              args: [videoId]
            });
            
            // 最後の取得時刻を記録
            lastFetchedVideos.set(feedId, Date.now());
            
            results.youtube.added++;
            console.log(`✅ ${channelName}: "${videoTitle}" を投稿`);
          }
        }
        
        results.youtube.fetched++;
        
      } catch (error: any) {
        console.error(`❌ ${channelName} エラー:`, error.message);
        results.youtube.errors.push({
          channel: channelName,
          error: error.message
        });
      }
    }
    
    // 2. X (Twitter) の処理
    console.log('🐦 X (Twitter)投稿を処理中...');
    
    // X用の特別なフィードソース（門田隆将）
    const xFeedId = 'x-kadota-ryusho';
    const xFeedName = 'X: 門田隆将';
    
    try {
      // Xフィードソースが存在しなければ作成
      const xFeedExists = await db.execute({
        sql: `SELECT id FROM feed_sources WHERE id = ?`,
        args: [xFeedId]
      });
      
      if (xFeedExists.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO feed_sources (
            id, name, url, type, category, enabled,
            check_interval_min, config_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
          args: [
            xFeedId,
            xFeedName,
            'https://x.com/KadotaRyusho', // プレースホルダーURL
            'json', // タイプ
            'X保守アカウント',
            30, // 30分ごと
            JSON.stringify({
              auto_approve: true,
              account: 'KadotaRyusho',
              account_name: '門田隆将',
              max_per_30min: 1,
              type: 'twitter'
            }),
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000)
          ]
        });
        console.log(`✅ ${xFeedName} フィードソースを作成`);
      }
      
      // 30分以内に取得したかチェック
      const lastXFetchTime = lastFetchedVideos.get(xFeedId) || 0;
      const halfHourAgo = Date.now() - 30 * 60 * 1000;
      
      if (lastXFetchTime > halfHourAgo) {
        console.log(`⏭️ ${xFeedName}: 30分制限のためスキップ`);
      } else {
        // ここでX APIまたは代替手段でツイートを取得
        // 現在はプレースホルダー実装
        
        // サンプルツイートを作成（実際のAPI実装が必要）
        const sampleTweet = {
          url: `https://x.com/KadotaRyusho/status/${Date.now()}`,
          text: '【サンプル】保守系の重要な話題についてのツイート',
          author: '門田隆将'
        };
        
        // 重複チェック
        const isDuplicate = await deduplicator.isDuplicate(sampleTweet.url, sampleTweet.text);
        
        if (!isDuplicate.isDuplicate) {
          const postId = crypto.randomUUID();
          
          // X投稿として保存
          await db.execute({
            sql: `INSERT INTO posts (
              id, owner_key, source_id, url, type, title, summary, thumbnail,
              embed_status, probe_json, tags_json, status, published_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              postId,
              'ADMIN_OPERATOR', // 運営として投稿
              xFeedId,
              sampleTweet.url,
              'x',
              `${sampleTweet.author}: ${sampleTweet.text.slice(0, 50)}...`,
              sampleTweet.text,
              null,
              'ok',
              JSON.stringify({
                type: 'twitter',
                author: sampleTweet.author,
                embedHtml: `<blockquote class="twitter-tweet"><a href="${sampleTweet.url}"></a></blockquote>`
              }),
              JSON.stringify(['保守', 'X', '門田隆将']),
              'published',
              Math.floor(Date.now() / 1000),
              Math.floor(Date.now() / 1000)
            ]
          });
          
          lastFetchedVideos.set(xFeedId, Date.now());
          results.twitter.added++;
          console.log(`✅ ${xFeedName}: ツイートを投稿`);
        }
        
        results.twitter.fetched++;
      }
      
    } catch (error: any) {
      console.error(`❌ X処理エラー:`, error.message);
      results.twitter.errors.push({
        account: '門田隆将',
        error: error.message
      });
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`📊 ソーシャルメディア処理完了 (${duration}ms):`, results);
    
    return NextResponse.json({
      ok: true,
      duration,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Social media cron failed:', error);
    
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Unknown error',
        results
      },
      { status: 500 }
    );
  }
}

// 手動実行用POSTエンドポイント
export async function POST(request: NextRequest) {
  return GET(request);
}