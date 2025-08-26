/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://platform.twitter.com https://www.tiktok.com https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src 'self' https://platform.twitter.com https://www.tiktok.com https://www.threads.net https://www.nicovideo.jp https://note.com; connect-src 'self';",
          },
        ],
      },
    ];
  },

  // ハニーポットルートの追加
  async rewrites() {
    return [
      // 一般的な攻撃対象パスをハニーポットにリダイレクト
      {
        source: '/wp-admin',
        destination: '/api/honeypot/wp-admin',
      },
      {
        source: '/wp-admin/:path*',
        destination: '/api/honeypot/wp-admin/:path*',
      },
      {
        source: '/admin.php',
        destination: '/api/honeypot/admin.php',
      },
      {
        source: '/phpmyadmin',
        destination: '/api/honeypot/phpmyadmin',
      },
      {
        source: '/phpmyadmin/:path*',
        destination: '/api/honeypot/phpmyadmin/:path*',
      },
      {
        source: '/.git/:path*',
        destination: '/api/honeypot/git/:path*',
      },
      {
        source: '/.env',
        destination: '/api/honeypot/env',
      },
      {
        source: '/backup.sql',
        destination: '/api/honeypot/backup.sql',
      },
      {
        source: '/config.json',
        destination: '/api/honeypot/config.json',
      },
      {
        source: '/login.aspx',
        destination: '/api/honeypot/login.aspx',
      },
      {
        source: '/database.yml',
        destination: '/api/honeypot/database.yml',
      },
    ];
  },
};

module.exports = nextConfig;