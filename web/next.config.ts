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
    ],
  },
  experimental: {
    optimizeCss: true
  },
  serverExternalPackages: ['@sparticuz/chromium-min','puppeteer-core']
};

export default nextConfig;
