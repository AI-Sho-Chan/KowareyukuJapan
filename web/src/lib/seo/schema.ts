type Ld = Record<string, any>;

export function clampText(input: string | null | undefined, max = 200): string | undefined {
  if (!input) return undefined;
  const cleaned = input
    .replace(/<[^>]+>/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const last = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('、'), cut.lastIndexOf('.'), cut.lastIndexOf(' '));
  return (last > 40 ? cut.slice(0, last) : cut) + '…';
}

export function buildWebsiteLd(opts: { baseUrl: string; name: string; }): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: opts.baseUrl,
    name: opts.name,
    inLanguage: 'ja-JP',
  };
}

export function buildArticleLd(opts: {
  id: string;
  title: string;
  url: string;
  description?: string;
  image?: string | null;
  datePublished?: string | number;
  dateModified?: string | number;
  siteName?: string;
}): Ld {
  const published = toIso(opts.datePublished);
  const modified = toIso(opts.dateModified || opts.datePublished);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: clampText(opts.title, 110),
    description: clampText(opts.description, 200),
    url: opts.url,
    mainEntityOfPage: opts.url,
    ...(opts.image ? { image: [{ '@type': 'ImageObject', url: opts.image }] } : {}),
    datePublished: published,
    dateModified: modified,
    inLanguage: 'ja-JP',
    publisher: opts.siteName ? { '@type': 'Organization', name: opts.siteName } : undefined,
  };
}

export function buildVideoLd(opts: {
  title: string;
  url: string;
  thumbnailUrl?: string | null;
  uploadDate?: string | number;
  duration?: number | null; // seconds
}): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: clampText(opts.title, 110),
    description: clampText(opts.title, 200),
    thumbnailUrl: opts.thumbnailUrl ? [opts.thumbnailUrl] : undefined,
    contentUrl: opts.url,
    uploadDate: toIso(opts.uploadDate),
    duration: opts.duration ? `PT${Math.max(1, Math.round(opts.duration))}S` : undefined,
  };
}

export function buildSocialPostingLd(opts: {
  title: string;
  url: string;
  author?: string;
  datePublished?: string | number;
}): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: clampText(opts.title, 110),
    url: opts.url,
    datePublished: toIso(opts.datePublished),
    inLanguage: 'ja-JP',
    author: opts.author ? { '@type': 'Person', name: opts.author } : undefined,
  };
}

function toIso(x?: string | number): string | undefined {
  if (!x) return undefined;
  if (typeof x === 'string') return new Date(x).toISOString();
  if (typeof x === 'number') return new Date(x).toISOString();
  return undefined;
}


