import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import crypto from 'crypto';

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

/**
 * トレンドスコア計算
 * スコア = (views * 0.2) + (empathies * 0.5) + (shares * 0.3)
 * 時間減衰: 24時間で50%減衰、48時間で25%減衰
 */
function calculateTrendScore(
  views: number,
  empathies: number,
  shares: number,
  publishedAt: number
): number {
  // 基本スコア
  const baseScore = (views * 0.2) + (empathies * 0.5) + (shares * 0.3);
  
  // 時間減衰係数
  const now = Math.floor(Date.now() / 1000);
  const ageInHours = (now - publishedAt) / 3600;
  
  let decayFactor = 1.0;
  if (ageInHours > 48) {
    decayFactor = 0.1; // 48時間以上経過で10%
  } else if (ageInHours > 24) {
    decayFactor = 0.25; // 24-48時間で25%
  } else if (ageInHours > 12) {
    decayFactor = 0.5; // 12-24時間で50%
  } else if (ageInHours > 6) {
    decayFactor = 0.75; // 6-12時間で75%
  }
  
  return baseScore * decayFactor;
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
  
  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    // 過去7日間の投稿とその統計を取得
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    
    const postsWithStats = await db.execute({
      sql: `
        SELECT 
          p.id,
          p.url,
          p.title,
          p.summary,
          p.thumbnail,
          p.type,
          p.published_at,
          COALESCE(ps.views, 0) as views,
          COALESCE(ps.empathies, 0) as empathies,
          COALESCE(ps.shares, 0) as shares
        FROM posts p
        LEFT JOIN post_stats ps ON p.id = ps.post_id
        WHERE p.status = 'published'
          AND p.published_at > ?
        ORDER BY p.published_at DESC
        LIMIT 500
      `,
      args: [sevenDaysAgo]
    });
    
    // トレンドスコアを計算
    const trendings = postsWithStats.rows.map(post => {
      const score = calculateTrendScore(
        Number(post.views),
        Number(post.empathies),
        Number(post.shares),
        Number(post.published_at)
      );
      
      return {
        postId: post.id,
        score,
        views: Number(post.views),
        empathies: Number(post.empathies),
        shares: Number(post.shares),
        publishedAt: Number(post.published_at)
      };
    })
    .filter(item => item.score > 0) // スコアが0より大きいもののみ
    .sort((a, b) => b.score - a.score) // スコア降順
    .slice(0, 100); // トップ100
    
    // トランザクション開始
    await db.execute('BEGIN');
    
    try {
      // 今日の日付（JST）
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const jstDate = new Date(now.getTime() + jstOffset);
      const dateStr = jstDate.toISOString().split('T')[0];
      
      // 既存のトレンドデータを削除
      await db.execute({
        sql: `DELETE FROM trending_daily WHERE date = ?`,
        args: [dateStr]
      });
      
      // 新しいトレンドデータを挿入
      for (let i = 0; i < trendings.length; i++) {
        const item = trendings[i];
        
        await db.execute({
          sql: `INSERT INTO trending_daily (
            id, date, rank, post_id, score,
            views, empathies, shares, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(),
            dateStr,
            i + 1, // rank (1-based)
            item.postId,
            item.score,
            item.views,
            item.empathies,
            item.shares,
            Math.floor(Date.now() / 1000)
          ]
        });
      }
      
      await db.execute('COMMIT');
      
      const duration = Date.now() - startTime;
      
      console.log(`Trending calculation completed in ${duration}ms: ${trendings.length} items`);
      
      return NextResponse.json({
        ok: true,
        date: dateStr,
        count: trendings.length,
        duration,
        topPosts: trendings.slice(0, 10).map(t => ({
          postId: t.postId,
          score: Math.round(t.score),
          stats: {
            views: t.views,
            empathies: t.empathies,
            shares: t.shares
          }
        }))
      });
      
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
    
  } catch (error: any) {
    console.error('Trending calculation failed:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to calculate trending' },
      { status: 500 }
    );
  }
}

// 手動実行用POSTエンドポイント
export async function POST(request: NextRequest) {
  return GET(request);
}