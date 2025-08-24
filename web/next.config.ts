import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
    ],
  },
  headers: async () => {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://platform.twitter.com",
      "frame-src https://platform.twitter.com https://*.twimg.com",
      "img-src 'self' https://pbs.twimg.com data:",
      "media-src https://video.twimg.com",
      "connect-src 'self'",
      "style-src 'self' 'unsafe-inline'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
  serverExternalPackages: ['@sparticuz/chromium-min','puppeteer-core'],
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
