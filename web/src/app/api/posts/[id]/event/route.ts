import { NextRequest, NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/db/stats-repository';
import { RateLimiter, getClientIP } from '@/lib/security';
import crypto from 'crypto';

const stats = new StatsRepository();

function fpFrom(req: NextRequest): string {
  const k = req.headers.get('x-client-key') || '';
  const ua = req.headers.get('user-agent') || '';
  return `${k}:${ua}`.slice(0, 200);
}

function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }){
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({} as any));
    // 互換性: body.type もしくは body.event_type を受け付ける
    const type = (body?.type || body?.event_type || '').toString();
    
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
    
    if (recent > 0) {
      return NextResponse.json({ ok:true, dedup:true });
    }

    const ipHash = ip ? hashIP(ip) : undefined;
    await stats.addEvent(id, type as any, fp, ipHash);
    // 直後の最新統計を返す（UI即時反映用）
    const { db } = await import('@/lib/db');
    const r = await db.execute({ sql: `SELECT views, empathies, shares FROM post_stats WHERE post_id = ?`, args: [id] });
    const s = r.rows[0] || { views: 0, empathies: 0, shares: 0 };
    return NextResponse.json({ ok:true, stats: s });
  } catch (error) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { db } = await import('@/lib/db');
    
    const statsResult = await db.execute({
      sql: `SELECT views, empathies, shares FROM post_stats WHERE post_id = ?`,
      args: [id]
    });
    
    return NextResponse.json({
      ok: true,
      stats: statsResult.rows[0] || { views: 0, empathies: 0, shares: 0 }
    });
    
  } catch (error: any) {
    console.error('Failed to get stats:', error);
    
    return NextResponse.json(
      { error: 'Failed to get statistics' },
      { status: 500 }
    );
  }
}
