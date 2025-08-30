import crypto from 'crypto';
import { NextRequest } from 'next/server';

export function verifyAdminSession(req: NextRequest): boolean {
  try {
    const cookie = req.cookies.get('admin_session')?.value || '';
    const m = cookie.match(/t=(\d+)\.s=([a-f0-9]{64})/);
    if (!m) return false;
    const ts = Number(m[1]);
    const sig = m[2];
    if (!ts || !sig) return false;
    // Expire after 24h
    if (Date.now() - ts > 24 * 60 * 60 * 1000) return false;
    const secret = process.env.ADMIN_SECRET_KEY || '';
    if (!secret) return false;
    const expect = crypto.createHmac('sha256', secret).update(`admin:${ts}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect));
  } catch { return false; }
}

