import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { FeedParser } from '@/lib/feed/parser';
import { Normalizer } from '@/lib/feed/normalizer';
import { Deduplicator } from '@/lib/feed/deduplicator';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60秒タイムアウト

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
    processed: 0,
    newItems: 0,
    duplicates: 0,
    errors: [] as any[],
  };

  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // アクティブなフィードソースを取得
    const sources = await db.execute(`
      SELECT id, name, url, type, category, config_json 
      FROM feed_sources 
      WHERE enabled = 1
      ORDER BY last_checked_at ASC NULLS FIRST
    `);

    const deduplicator = new Deduplicator(db);

    // 各フィードを処理
    for (const source of sources.rows) {
      const sourceId = source.id as string;
      const feedUrl = source.url as string;
      const sourceName = source.name as string;
      const category = source.category as string;
      const configJson = source.config_json as string;
      
      const feedLogId = crypto.randomUUID();
      const feedStartTime = Date.now();
      
      try {
        console.log(`Processing feed: ${sourceName} (${feedUrl})`);
        
        // フィードをパース
        const feed = await FeedParser.parse(feedUrl);
        
        let itemsFound = 0;
        let itemsNew = 0;
        
        // 各アイテムを処理
        for (const item of feed.items) {
          if (!item.url) continue;
          
          itemsFound++;
          
          // 重複チェック
          const dupCheck = await deduplicator.isDuplicate(item.url, item.title);
          if (dupCheck.isDuplicate) {
            results.duplicates++;
            continue;
          }
          
          // feed_itemsに保存
          const itemId = crypto.randomUUID();
          const urlHash = Normalizer.hashUrl(item.url);
          const titleHash = item.title ? Normalizer.hashTitle(item.title) : null;
          const normalizedContent = Normalizer.normalizeContent(item.content || item.summary);
          const summary = Normalizer.generateSummary(normalizedContent);
          const tags = Normalizer.generateTags(item.title, normalizedContent);
          
          await db.execute({
            sql: `INSERT INTO feed_items (
              id, source_id, guid, title, url, published_at,
              content, author, tags_json, status, hash_url, hash_title
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              itemId,
              sourceId,
              item.guid || item.url,
              item.title || '',
              item.url,
              item.publishedAt ? Math.floor(item.publishedAt.getTime() / 1000) : null,
              summary || null,
              item.author || null,
              JSON.stringify(tags),
              'pending', // デフォルトはpending
              urlHash,
              titleHash || null,
            ],
          });
          
          itemsNew++;
          results.newItems++;
        }
        
        // フィードログを記録
        await db.execute({
          sql: `INSERT INTO feed_logs (
            id, source_id, items_found, items_new, duration_ms, error
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            feedLogId,
            sourceId,
            itemsFound,
            itemsNew,
            Date.now() - feedStartTime,
            null,
          ],
        });
        
        // last_checked_atを更新
        await db.execute({
          sql: `UPDATE feed_sources SET last_checked_at = ?, error_count = 0 WHERE id = ?`,
          args: [Math.floor(Date.now() / 1000), sourceId],
        });
        
        results.processed++;
        
      } catch (error: any) {
        console.error(`Error processing feed ${sourceName}:`, error);
        
        // エラーログを記録
        await db.execute({
          sql: `INSERT INTO feed_logs (
            id, source_id, items_found, items_new, duration_ms, error
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            feedLogId,
            sourceId,
            0,
            0,
            Date.now() - feedStartTime,
            error.message || 'Unknown error',
          ],
        });
        
        // エラーカウントを増やす
        await db.execute({
          sql: `UPDATE feed_sources 
                SET error_count = error_count + 1, 
                    last_checked_at = ? 
                WHERE id = ?`,
          args: [Math.floor(Date.now() / 1000), sourceId],
        });
        
        results.errors.push({
          source: sourceName,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`Feed check completed in ${duration}ms:`, results);
    
    return NextResponse.json({
      ok: true,
      duration,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('Feed check failed:', error);
    
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Unknown error',
        results,
      },
      { status: 500 }
    );
  }
}

// 手動実行用POSTエンドポイント
export async function POST(request: NextRequest) {
  return GET(request);
}