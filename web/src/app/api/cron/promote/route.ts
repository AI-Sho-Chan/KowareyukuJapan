import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { Normalizer } from '@/lib/feed/normalizer';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Cronジョブ認証�E�Eercel Cron用�E�E
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  
  // 開発環墁E��は許可
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return false;
}

export async function GET(request: NextRequest) {
  // Cron認証チェチE��
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results = {
    promoted: 0,
    skipped: 0,
    errors: [] as any[],
  };

  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // pendingスチE�EタスのアイチE��を取得（最新100件�E�E
    const pendingItems = await db.execute(`
      SELECT 
        fi.*,
        fs.name as source_name,
        fs.category as source_category,
        fs.config_json as source_config
      FROM feed_items fi
      JOIN feed_sources fs ON fi.source_id = fs.id
      WHERE fi.status = 'pending'
      ORDER BY fi.created_at DESC
      LIMIT 100
    `);

    for (const item of pendingItems.rows) {
      try {
        const itemId = item.id as string;
        const sourceId = item.source_id as string;
        const url = item.url as string;
        const title = item.title as string;
        const content = item.content as string;
        const publishedAt = item.published_at as number | null;
        const tagsJson = item.tags_json as string;
        const sourceCategory = item.source_category as string;
        const sourceConfig = item.source_config as string | null;
        
        // 設定から�E動承認判宁E
        let autoApprove = false;
        if (sourceConfig) {
          try {
            const config = JSON.parse(sourceConfig);
            autoApprove = config.auto_approve === true;
          } catch {}
        }

        // カチE��リによる自動承認（ニュースは基本皁E��自動承認！E
        if (sourceCategory === 'news') {
          autoApprove = true;
        }

        if (!autoApprove) {
          // 自動承認でなぁE��合�EスキチE�E
          results.skipped++;
          continue;
        }

        // URLからサイトタイプを判宁E
        let postType = 'web';
        const urlLower = url.toLowerCase();
        if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
          postType = 'youtube';
        } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
          postType = 'x';
        } else if (urlLower.includes('instagram.com')) {
          postType = 'instagram';
        } else if (urlLower.includes('tiktok.com')) {
          postType = 'tiktok';
        }

        // サマリー生�E
        const summary = content || Normalizer.generateSummary(title);

        // 埋め込み可否チェチE���E�簡易版�E�E
        let embedStatus = 'unknown';
        let probeJson = null;

        // 既存�E埋め込みチェチE��APIを呼び出す（�E部呼び出し！E
        try {
          const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/can-embed?url=${encodeURIComponent(url)}`);
          if (response.ok) {
            const result = await response.json();
            embedStatus = result.canEmbed ? 'ok' : 'blocked';
            probeJson = JSON.stringify(result);
          }
        } catch (e) {
          // エラーは無要E
        }

        // Only publish embeddable sources
        if (embedStatus !== 'ok') { results.skipped++; continue; }

        // posts insert
        const postId = crypto.randomUUID();
        const systemOwnerKey = 'ADMIN_OPERATOR'; // 運営による自動投稿
        
        await db.execute({
          sql: `INSERT INTO posts (
            id, owner_key, source_id, url, type, title, summary, thumbnail,
            embed_status, probe_json, tags_json, status, published_at,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            postId,
            systemOwnerKey,
            sourceId,
            url,
            postType,
            title,
            summary,
            null, // サムネイルは後で生�E
            embedStatus,
            probeJson,
            tagsJson,
            'published', // 自動承認なので即公閁E
            publishedAt,
            Math.floor(Date.now() / 1000),
          ],
        });

        // feed_itemのスチE�Eタスを更新
        await db.execute({
          sql: `UPDATE feed_items SET status = 'approved' WHERE id = ?`,
          args: [itemId],
        });

        // post_statsレコードを初期匁E
        await db.execute({
          sql: `INSERT OR IGNORE INTO post_stats (post_id, views, empathies, shares) VALUES (?, 0, 0, 0)`,
          args: [postId],
        });

        results.promoted++;

      } catch (error: any) {
        console.error('Error promoting item:', error);
        results.errors.push({
          item: item.id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`Promote completed in ${duration}ms:`, results);
    
    return NextResponse.json({
      ok: true,
      duration,
      results,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('Promote failed:', error);
    
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

// 手動実行用POSTエンド�EインチE
export async function POST(request: NextRequest) {
  return GET(request);
}

