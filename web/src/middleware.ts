import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const enabled = (process.env.MAINTENANCE_MODE || '').toLowerCase() === '1'
    || (process.env.MAINTENANCE_MODE || '').toLowerCase() === 'true';
  if (!enabled) return NextResponse.next();

  // API only; block with 410 Gone
  const payload = { ok: false, maintenance: true, status: 410, message: 'Service archived' };
  return new NextResponse(JSON.stringify(payload), {
    status: 410,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};

