import { NextRequest, NextResponse } from 'next/server';

// Protect admin UI routes via simple cookie presence (API routes already verify signature)
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only guard admin UI pages under /admin (not API, which lives under /api)
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow the admin root page to render as the login screen
  // Avoid redirect loops by skipping guard for "/admin" itself
  if (pathname === '/admin') {
    return NextResponse.next();
  }

  // Optional IP allowlist (comma separated) e.g. 127.0.0.1,::1
  const wl = (process.env.ADMIN_IP_WHITELIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (wl.length > 0) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || (req as any).ip || '';
    if (ip && !wl.includes(ip)) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  const token = req.cookies.get('admin_session')?.value || '';
  if (!token || !/^t=\d+\.s=[a-f0-9]{64}$/.test(token)) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin';
    // Preserve original destination for post-login redirect
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
