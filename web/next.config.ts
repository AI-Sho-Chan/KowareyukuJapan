import type { NextConfig } from "next";
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "pbs.twimg.com" },
    ],
  },
  headers: async () => {
    if (!isProd) return [];
    const csp = [
      "default-src 'self'",
      "frame-src https: http: data: https://platform.twitter.com https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com",
      "img-src 'self' https: data: blob:",
      "media-src https: blob:",
      "script-src 'self' https://platform.twitter.com https://www.instagram.com",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "frame-ancestors 'self'",
    ].join('; ');
    return [
      { source: '/:path*', headers: [ { key: 'Content-Security-Policy', value: csp } ] }
    ];
  },
  serverExternalPackages: ['@sparticuz/chromium-min','puppeteer-core','jsdom','@mozilla/readability'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
