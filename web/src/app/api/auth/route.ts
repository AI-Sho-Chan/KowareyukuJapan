import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get('logout') === '1') {
    const res = NextResponse.json({ ok: true, message: 'logged out' });
    res.cookies.set('admin_session', '', { httpOnly: true, secure: process.env.NODE_ENV==='production', sameSite: 'lax', path: '/', maxAge: 0 });
    return res;
  }
  return NextResponse.json({ ok: true, message: '認証API稼働中', methods: ['POST'] });
}

export async function POST(req: NextRequest) {
  try {
    const { adminKey } = await req.json();
    const expectedKey = process.env.ADMIN_SECRET_KEY;
    if (!expectedKey) {
      // サーバー側で管理キーが設定されていない場合でも 500 ではなく 400 を返す
      return NextResponse.json({ error: 'サーバー側の管理キーが未設定です' }, { status: 400 });
    }
    if (adminKey !== expectedKey) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }
    const ts = Date.now();
    const secret = expectedKey;
    const hmac = crypto.createHmac('sha256', secret).update(`admin:${ts}`).digest('hex');
    const token = `t=${ts}.s=${hmac}`;
    const res = NextResponse.json({ ok: true, message: '認証に成功しました' });
    res.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: '認証中にエラーが発生しました' }, { status: 500 });
  }
}

