// ハニーポットエンドポイント
// 攻撃者を検出して即座にブロック

import { NextRequest, NextResponse } from 'next/server';
import { HoneypotSystem } from '@/lib/security/privacy-protection';
import { getClientIP } from '@/lib/security';

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = '/' + params.path.join('/');
  const ip = getClientIP(req as any);
  
  // ハニーポットアクセスを処理
  const response = await HoneypotSystem.handleHoneypotAccess(
    path,
    ip,
    req.headers
  );
  
  return response;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = '/' + params.path.join('/');
  const ip = getClientIP(req as any);
  
  // ハニーポットアクセスを処理
  const response = await HoneypotSystem.handleHoneypotAccess(
    path,
    ip,
    req.headers
  );
  
  return response;
}

// すべてのHTTPメソッドに対応
export const PUT = POST;
export const DELETE = POST;
export const PATCH = POST;
export const HEAD = GET;
export const OPTIONS = GET;