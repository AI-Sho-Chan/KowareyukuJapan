export function normalizeInstagramUrl(raw: string): string {
  try {
    const u = new URL(raw.replace('instagr.am', 'instagram.com'));
    u.protocol = 'https:';
    u.hostname = 'www.instagram.com';
    u.search = '';
    u.hash = '';
    return u.toString().replace(/\/+$/, '/');
  } catch {
    return raw;
  }
}

export function toEmbedUrl(raw: string): string | null {
  try {
    const url = normalizeInstagramUrl(raw);
    const m = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i);
    if (!m) return null;
    return `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned/`;
  } catch {
    return null;
  }
}


