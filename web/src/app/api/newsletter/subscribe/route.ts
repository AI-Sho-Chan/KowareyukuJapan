import { NextRequest, NextResponse } from 'next/server';
import { db, formatDate } from '@/lib/db';
import crypto from 'node:crypto';
import { RateLimiter, getClientIP } from '@/lib/security';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req as any);
  const body = await req.json().catch(()=>({} as any));
  const email = String(body?.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok:false, error:'bad_email' }, { status:400 });

  const rl = await RateLimiter.checkCombined(ip, email, 'newsletter:sub');
  if (!rl.allowed) return NextResponse.json({ ok:false, error:'rate_limited' }, { status:429, headers: rl.headers });

  const token = crypto.randomBytes(16).toString('hex');
  await db.execute({
    sql: `INSERT INTO subscribers (email, status, token, created_at, updated_at)
          VALUES (?, 'pending', ?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET token=excluded.token, status='pending', updated_at=excluded.updated_at`,
    args: [email, token, formatDate(), formatDate()],
  });

  // NOTE: 実送信は別実装（Resend/SES等）。ここでは確認URLを返すのみ。
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const confirmUrl = `${base}/api/newsletter/confirm?token=${token}`;
  return NextResponse.json({ ok:true, confirmUrl });
}


