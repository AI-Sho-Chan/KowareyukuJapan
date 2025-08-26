export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import chromium from '@sparticuz/chromium-min';
const useLocal = false;
const getPuppeteer = async () => await import('puppeteer-core');

const toTwitter = (u: string) => u.replace(/^https?:\/\/x\.com\//i, 'https://twitter.com/');

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new Response('url is required', { status: 400 });

  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.launch({
    args: useLocal ? [] : chromium.args,
    executablePath: useLocal ? undefined : await chromium.executablePath(),
    headless: 'new',
    defaultViewport: { width: 700, height: 1000 },
  } as any);
  try {
    const page = await browser.newPage();
    const html = `<!doctype html><meta charset="utf-8"/>
<style>body{margin:0;padding:24px;background:#fff}</style>
<blockquote id="wrap" class="twitter-tweet"><a href="${toTwitter(url)}"></a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.waitForSelector('iframe.twitter-tweet-rendered', { timeout: 12000 });
    const el = await page.$('#wrap');
    const clip = await el!.boundingBox();
    const buf = await page.screenshot({ type: 'png', clip: clip || undefined });
    return new Response(buf, { headers: { 'content-type': 'image/png', 'cache-control': 'public, s-maxage=86400' } });
  } finally {
    await browser.close();
  }
}


