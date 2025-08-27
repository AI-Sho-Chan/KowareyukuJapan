import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: '認証APIは稼働中です',
    methods: ['POST']
  });
}

export async function POST(req: NextRequest) {
  try {
    const { adminKey } = await req.json();
    
    // Server-side validation using environment variable
    const expectedKey = process.env.ADMIN_SECRET_KEY;
    
    if (!expectedKey) {
      console.error('ADMIN_SECRET_KEY not configured');
      return NextResponse.json({ error: '認証システムが設定されていません' }, { status: 500 });
    }
    
    if (adminKey !== expectedKey) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
    }
    
    // Generate a secure session token
    const token = crypto.randomBytes(32).toString('hex');
    
    return NextResponse.json({ 
      ok: true, 
      token,
      message: '認証に成功しました'
    });
    
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ error: '認証中にエラーが発生しました' }, { status: 500 });
  }
}