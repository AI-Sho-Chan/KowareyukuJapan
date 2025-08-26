import { NextRequest, NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/db/stats-repository';
import { RateLimiter, getClientIP } from '@/lib/security';

const stats = new StatsRepository();

function fpFrom(req: NextRequest): string {
  const k = req.headers.get('x-client-key') || '';
  const ua = req.headers.get('user-agent') || '';
  return `${k}:${ua}`.slice(0, 200);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }){
  const id = params.id;
  const body = await req.json().catch(() => ({} as any));
  const type = (body?.type || '').toString();
  if (!['view','empathy','share'].includes(type)) {
    return NextResponse.json({ ok:false, error:'bad_type' }, { status:400 });
  }

  const ip = getClientIP(req as any);
  const ownerKey = req.headers.get('x-client-key') || 'anon';
  const rl = await RateLimiter.checkCombined(ip, ownerKey, `event:${type}`);
  if (!rl.allowed) {
    return NextResponse.json({ ok:false, error:'rate_limited' }, { status:429, headers: rl.headers });
  }

  const fp = fpFrom(req);
  const recent = await stats.recentEventsCount(id, type as any, fp, 5);
  if (recent > 0) return NextResponse.json({ ok:true, dedup:true });

  await stats.addEvent(id, type as any, fp);
  return NextResponse.json({ ok:true });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import crypto from 'crypto';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

// イベントタイプの定義
const EVENT_TYPES = ['view', 'empathy', 'share', 'click'] as const;
type EventType = typeof EVENT_TYPES[number];

// レート制限設定（メモリベース - 本番環境ではRedis推奨）
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = `event:${identifier}`;
  
  const record = rateLimitStore.get(key);
  
  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

// 重複イベント防止（メモリベース）
const eventDedupeStore = new Map<string, number>();

function isDuplicateEvent(postId: string, fingerprint: string, eventType: string, windowMs: number = 5000): boolean {
  const now = Date.now();
  const key = `${postId}:${fingerprint}:${eventType}`;
  
  const lastTime = eventDedupeStore.get(key);
  
  if (lastTime && (now - lastTime) < windowMs) {
    return true;
  }
  
  eventDedupeStore.set(key, now);
  
  // メモリクリーンアップ（古いエントリを削除）
  if (eventDedupeStore.size > 10000) {
    const cutoff = now - 60000;
    for (const [k, v] of eventDedupeStore.entries()) {
      if (v < cutoff) {
        eventDedupeStore.delete(k);
      }
    }
  }
  
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    const body = await request.json();
    const { event_type, fingerprint, session_id, metadata } = body;
    
    // バリデーション
    if (!event_type || !EVENT_TYPES.includes(event_type)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }
    
    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 16) {
      return NextResponse.json(
        { error: 'Invalid fingerprint' },
        { status: 400 }
      );
    }
    
    // レート制限チェック
    if (!checkRateLimit(fingerprint)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    
    // 重複イベントチェック（viewは5秒、それ以外は10秒）
    const dedupeWindow = event_type === 'view' ? 5000 : 10000;
    if (isDuplicateEvent(postId, fingerprint, event_type, dedupeWindow)) {
      return NextResponse.json(
        { ok: true, deduplicated: true },
        { status: 200 }
      );
    }
    
    // IPアドレス取得（プライバシーのためハッシュ化）
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    
    // User Agent
    const userAgent = headersList.get('user-agent') || '';
    
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    // トランザクション開始
    await db.execute('BEGIN');
    
    try {
      // イベントをeventsテーブルに記録
      const eventId = crypto.randomUUID();
      
      await db.execute({
        sql: `INSERT INTO events (
          id, post_id, event_type, fingerprint, session_id,
          ip_hash, user_agent, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          eventId,
          postId,
          event_type,
          fingerprint,
          session_id || null,
          ipHash,
          userAgent.slice(0, 255), // Limit UA length
          metadata ? JSON.stringify(metadata) : null,
          Math.floor(Date.now() / 1000)
        ]
      });
      
      // post_statsを更新（UPSERT）
      if (event_type === 'view') {
        await db.execute({
          sql: `INSERT INTO post_stats (post_id, views, empathies, shares)
                VALUES (?, 1, 0, 0)
                ON CONFLICT(post_id) DO UPDATE SET
                views = views + 1`,
          args: [postId]
        });
      } else if (event_type === 'empathy') {
        await db.execute({
          sql: `INSERT INTO post_stats (post_id, views, empathies, shares)
                VALUES (?, 0, 1, 0)
                ON CONFLICT(post_id) DO UPDATE SET
                empathies = empathies + 1`,
          args: [postId]
        });
      } else if (event_type === 'share') {
        await db.execute({
          sql: `INSERT INTO post_stats (post_id, views, empathies, shares)
                VALUES (?, 0, 0, 1)
                ON CONFLICT(post_id) DO UPDATE SET
                shares = shares + 1`,
          args: [postId]
        });
      }
      
      await db.execute('COMMIT');
      
      // 現在の統計を返す
      const stats = await db.execute({
        sql: `SELECT views, empathies, shares FROM post_stats WHERE post_id = ?`,
        args: [postId]
      });
      
      return NextResponse.json({
        ok: true,
        event_id: eventId,
        stats: stats.rows[0] || { views: 0, empathies: 0, shares: 0 }
      });
      
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
    
  } catch (error: any) {
    console.error('Event tracking error:', error);
    
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

// GET: イベント統計取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    const stats = await db.execute({
      sql: `SELECT views, empathies, shares FROM post_stats WHERE post_id = ?`,
      args: [postId]
    });
    
    return NextResponse.json({
      ok: true,
      stats: stats.rows[0] || { views: 0, empathies: 0, shares: 0 }
    });
    
  } catch (error: any) {
    console.error('Failed to get stats:', error);
    
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}