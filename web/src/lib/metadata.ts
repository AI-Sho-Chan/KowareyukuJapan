export type Meta = {
  title: string | null;
  siteName?: string | null;
  image?: string | null;
  provider?: string | null;
};

export async function fetchYouTubeMeta(url: string): Promise<Meta> {
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

export async function fetchGenericMeta(url: string): Promise<Meta> {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" }, next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
  const html = await r.text();
  // 1) OGP/Twitter, 2) JSON-LD headline/name, 3) <h1>, 4) <title>
  let title = pickMetaTag(html, "og:title") || pickMetaTag(html, "twitter:title");
  if (!title) {
    // JSON-LD
    const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const s of scripts) {
      try {
        const jsonText = s.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
        const data = JSON.parse(jsonText);
        const candidates = Array.isArray(data) ? data : [data];
        for (const item of candidates) {
          const t = item?.headline || item?.name || item?.title;
          if (typeof t === 'string' && t.trim()) { title = t.trim(); break; }
        }
        if (title) break;
      } catch {}
    }
  }
  if (!title) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) title = h1[1].replace(/<[^>]+>/g, '').trim();
  }
  if (!title) {
    title = pickTitle(html);
  }
  // Cleanup suffix like "｜サイト名" or " - Site"
  if (title) {
    title = title.replace(/\s*[|｜\-]\s*[^|｜\-]+$/u, '').trim();
  }
  const image = pickMetaTag(html, "og:image") || pickMetaTag(html, "twitter:image");
  const siteName = pickMetaTag(html, "og:site_name");
  return { title: title ?? null, image: image ?? null, siteName: siteName ?? null, provider: null };
}

export async function fetchMeta(url: string): Promise<Meta> {
  const u = new URL(url);
  if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
    return fetchYouTubeMeta(url);
  }
  return fetchGenericMeta(url);
}


