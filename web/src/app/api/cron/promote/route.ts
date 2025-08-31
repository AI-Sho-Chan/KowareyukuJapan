import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { Normalizer } from '@/lib/feed/normalizer';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Cron繧ｸ繝ｧ繝冶ｪ崎ｨｼ・・ercel Cron逕ｨ・・
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  
  // 髢狗匱迺ｰ蠅・〒縺ｯ險ｱ蜿ｯ
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return false;
}

export async function GET(request: NextRequest) {
  // Cron隱崎ｨｼ繝√ぉ繝・け
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

    // pending繧ｹ繝・・繧ｿ繧ｹ縺ｮ繧｢繧､繝・Β繧貞叙蠕暦ｼ域怙譁ｰ100莉ｶ・・
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
        
        // 險ｭ螳壹°繧芽・蜍墓価隱榊愛螳・
        let autoApprove = false;
        if (sourceConfig) {
          try {
            const config = JSON.parse(sourceConfig);
            autoApprove = config.auto_approve === true;
          } catch {}
        }

        // 繧ｫ繝・ざ繝ｪ縺ｫ繧医ｋ閾ｪ蜍墓価隱搾ｼ医ル繝･繝ｼ繧ｹ縺ｯ蝓ｺ譛ｬ逧・↓閾ｪ蜍墓価隱搾ｼ・
        if (sourceCategory === 'news') {
          autoApprove = true;
        }

        if (!autoApprove) {
          // 閾ｪ蜍墓価隱阪〒縺ｪ縺・ｴ蜷医・繧ｹ繧ｭ繝・・
          results.skipped++;
          continue;
        }

        // URL縺九ｉ繧ｵ繧､繝医ち繧､繝励ｒ蛻､螳・
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

        // 繧ｵ繝槭Μ繝ｼ逕滓・
        const summary = content || Normalizer.generateSummary(title);

        // 蝓九ａ霎ｼ縺ｿ蜿ｯ蜷ｦ繝√ぉ繝・け・育ｰ｡譏鍋沿・・
        let embedStatus = 'unknown';
        let probeJson = null;

        // 譌｢蟄倥・蝓九ａ霎ｼ縺ｿ繝√ぉ繝・けAPI繧貞他縺ｳ蜃ｺ縺呻ｼ亥・驛ｨ蜻ｼ縺ｳ蜃ｺ縺暦ｼ・
        try {
          const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/can-embed?url=${encodeURIComponent(url)}`);
          if (response.ok) {
            const result = await response.json();
            embedStatus = result.canEmbed ? 'ok' : 'blocked';
            probeJson = JSON.stringify(result);
          }
        } catch (e) {
          // 繧ｨ繝ｩ繝ｼ縺ｯ辟｡隕・
        }

        // Only publish embeddable sources
        if (embedStatus !== 'ok') { results.skipped++; continue; }

        // posts insert
        const postId = crypto.randomUUID();
        const systemOwnerKey = 'ADMIN_OPERATOR'; // 驕句霧縺ｫ繧医ｋ閾ｪ蜍墓兜遞ｿ
        
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
            null, // 繧ｵ繝繝阪う繝ｫ縺ｯ蠕後〒逕滓・
            embedStatus,
            probeJson,
            tagsJson,
            'published', // 閾ｪ蜍墓価隱阪↑縺ｮ縺ｧ蜊ｳ蜈ｬ髢・
            publishedAt,
            Math.floor(Date.now() / 1000),
          ],
        });

        // feed_item縺ｮ繧ｹ繝・・繧ｿ繧ｹ繧呈峩譁ｰ
        await db.execute({
          sql: `UPDATE feed_items SET status = 'approved' WHERE id = ?`,
          args: [itemId],
        });

        // post_stats繝ｬ繧ｳ繝ｼ繝峨ｒ蛻晄悄蛹・
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

// 謇句虚螳溯｡檎畑POST繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
export async function POST(request: NextRequest) {
  return GET(request);
}

