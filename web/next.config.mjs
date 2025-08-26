/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
const isCI = process.env.CI === 'true';

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pbs.twimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'abs.twimg.com', pathname: '/**' },
    ],
    dangerouslyAllowSVG: false,
  },
  async headers() {
    if (!isProd) return [];
    const csp = [
      "default-src 'self'",
      "frame-src https: data: https://platform.twitter.com https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://www.tiktok.com https://www.threads.net https://embed.nicovideo.jp https://note.com",
      "img-src 'self' https: data: blob:",
      "media-src https: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://platform.twitter.com https://www.instagram.com https://www.tiktok.com https://www.threads.net",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "frame-ancestors 'self'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Honeypot routes
      { source: '/wp-admin', destination: '/api/honeypot/wp-admin' },
      { source: '/wp-admin/:path*', destination: '/api/honeypot/wp-admin/:path*' },
      { source: '/admin.php', destination: '/api/honeypot/admin.php' },
      { source: '/phpmyadmin', destination: '/api/honeypot/phpmyadmin' },
      { source: '/phpmyadmin/:path*', destination: '/api/honeypot/phpmyadmin/:path*' },
      { source: '/.git/:path*', destination: '/api/honeypot/git/:path*' },
      { source: '/.env', destination: '/api/honeypot/env' },
      { source: '/backup.sql', destination: '/api/honeypot/backup.sql' },
      { source: '/config.json', destination: '/api/honeypot/config.json' },
      { source: '/login.aspx', destination: '/api/honeypot/login.aspx' },
      { source: '/database.yml', destination: '/api/honeypot/database.yml' },
    ];
  },
  serverExternalPackages: ['@sparticuz/chromium-min','puppeteer-core','puppeteer','jsdom','@mozilla/readability','sharp','fluent-ffmpeg','ffmpeg-static','ffprobe-static','@libsql/client','@libsql/hrana-client','nodemailer'],
  typescript: { ignoreBuildErrors: !isCI },
  eslint: { ignoreDuringBuilds: !isCI }
};

export default nextConfig;