export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

// ヘルスチェックエンドポイント
export async function GET() {
  const status: any = {
    ok: true,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      api: 'operational',
      db: 'unknown',
      queue: 'unknown',
    },
    metrics: {},
  };
  
  // データベースチェック
  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    // シンプルなクエリでDB接続確認
    const result = await db.execute('SELECT COUNT(*) as count FROM posts');
    const postCount = result.rows[0]?.count || 0;
    
    status.checks.db = 'operational';
    status.metrics.posts = postCount;
    
    // フィード数の取得
    try {
      const feedResult = await db.execute('SELECT COUNT(*) as count FROM feed_sources WHERE enabled = 1');
      status.metrics.active_feeds = feedResult.rows[0]?.count || 0;
    } catch (e) {
      // テーブルがまだない場合は無視
    }
    
    // イベント数の取得（直近24時間）
    try {
      const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
      const eventResult = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM events WHERE created_at > ?',
        args: [oneDayAgo],
      });
      status.metrics.events_24h = eventResult.rows[0]?.count || 0;
    } catch (e) {
      // テーブルがまだない場合は無視
    }
    
  } catch (error: any) {
    status.checks.db = 'degraded';
    status.errors = status.errors || [];
    status.errors.push({
      component: 'database',
      message: error.message || 'Database connection failed',
    });
    status.ok = false;
  }
  
  // キューチェック（Upstash Redis）
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const response = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/ping`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        }
      );
      
      if (response.ok) {
        status.checks.queue = 'operational';
      } else {
        status.checks.queue = 'degraded';
      }
    } catch (error: any) {
      status.checks.queue = 'degraded';
      status.errors = status.errors || [];
      status.errors.push({
        component: 'queue',
        message: 'Queue service unreachable',
      });
    }
  } else {
    status.checks.queue = 'not_configured';
  }
  
  // Sentryチェック
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    status.checks.monitoring = 'configured';
  } else {
    status.checks.monitoring = 'not_configured';
  }
  
  // 全体のステータス判定
  const criticalChecks = [status.checks.api, status.checks.db];
  if (criticalChecks.some(check => check !== 'operational')) {
    status.ok = false;
  }
  
  // HTTPステータスコード
  const httpStatus = status.ok ? 200 : 503;
  
  return NextResponse.json(status, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': status.ok ? 'healthy' : 'unhealthy',
    },
  });
}
