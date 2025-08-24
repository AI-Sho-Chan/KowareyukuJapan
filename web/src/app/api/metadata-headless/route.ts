export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import chromium from '@sparticuz/chromium-min';

const useLocal = !process.env.VERCEL;
const getPuppeteer = async () => useLocal ? await import('puppeteer') : await import('puppeteer-core');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const stripSuffix = (t: string) => t.replace(/\s*[|｜\-]\s*[^|｜\-]+$/u, '').trim();
const stripTags = (s: string) => s.replace(/<[^>]*>/g, '');

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return Response.json({ ok: false, error: 'url is required' }, { status: 400 });

  const puppeteer = await getPuppeteer();
  const exePath = useLocal ? undefined : await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: useLocal ? [] : chromium.args,
    executablePath: exePath,
    headless: 'new',
    defaultViewport: { width: 1200, height: 900 },
  } as any);
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.3',
      Referer: 'https://www.google.com/',
    });
    await page.setRequestInterception(true);
    page.on('request', (r) => {
      const type = r.resourceType();
      if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') r.abort(); else r.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(
      () => {
        const hasMeta = document.querySelector('meta[property="og:title"]') || document.querySelector('meta[name="twitter:title"]');
        const hasScript = document.querySelector('script[type="application/ld+json"]');
        const hasH1 = document.querySelector('h1');
        const hasTitle = document.title;
        return !!(hasMeta || hasScript || hasH1 || hasTitle);
      },
      { timeout: 6000 }
    );
    const title = await page.evaluate(() => {
      const pick = (sel: string, attr = 'content') => (document.querySelector(sel) as HTMLMetaElement | null)?.getAttribute(attr) || '';
      let t = pick('meta[property="og:title"]') || pick('meta[name="twitter:title"]');
      if (!t) {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
          try {
            const data = JSON.parse(s.textContent || '{}');
            const list = Array.isArray(data) ? data : [data];
            for (const it of list) {
              const c = (it as any)?.headline || (it as any)?.name || (it as any)?.title;
              if (typeof c === 'string' && c.trim()) { t = c.trim(); break; }
            }
            if (t) break;
          } catch {}
        }
      }
      if (!t) {
        const h1 = document.querySelector('h1');
        t = h1 ? (h1.textContent||'').replace(/\s+/g,' ').trim() : '';
      }
      if (!t) t = document.title || '';
      return t;
    });
    const clean = stripTags(stripSuffix(title || ''));
    return Response.json({ ok: true, title: clean || null });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  } finally {
    await browser.close();
  }
}


