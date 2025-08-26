import { NextRequest, NextResponse } from "next/server";
import { fetchMeta } from "@/lib/metadata";
import { validateOutboundUrl } from "@/lib/ssrf";

type Meta = {
  title: string | null;
  siteName?: string | null;
  image?: string | null;
  provider?: string | null;
};

async function fetchYouTube(url: string): Promise<Meta> {
  const api = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  const r = await fetch(api, { next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`oembed failed: ${r.status}`);
  const j = await r.json();
  return { title: j.title ?? null, provider: "YouTube", siteName: "YouTube", image: null };
}

function pickMetaTag(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const m = html.match(re);
  return m ? m[1] : null;
}

function pickTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

async function fetchGeneric(url: string): Promise<Meta> {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
  const html = await r.text();
  const title = pickMetaTag(html, "og:title") || pickMetaTag(html, "twitter:title") || pickTitle(html);
  const image = pickMetaTag(html, "og:image") || pickMetaTag(html, "twitter:image");
  const siteName = pickMetaTag(html, "og:site_name");
  return { title: title ?? null, image: image ?? null, siteName: siteName ?? null, provider: null };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  try {
    await validateOutboundUrl(url, { allowHttp: false });
    const meta = await fetchMeta(url);
    return NextResponse.json({ ok: true, meta });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
  return GET(new NextRequest(new URL(req.url + `?url=${encodeURIComponent(url)}`)));
}


