export function toYTEmbed(u: string): { src: string; id: string } | null {
  try {
    const url = new URL(u);
    let id: string | null = null;

    const host = url.hostname.toLowerCase();
    if (host === 'youtu.be') {
      id = url.pathname.slice(1) || null;
    } else if (host.endsWith('youtube.com')) {
      const path = url.pathname;
      if (path === '/watch') id = url.searchParams.get('v');
      else if (path.startsWith('/shorts/')) id = path.split('/')[2] || null;
      else if (path.startsWith('/embed/')) id = path.split('/')[2] || null;
    }
    if (!id) return null;

    const qs = new URLSearchParams();
    const list = url.searchParams.get('list'); if (list) qs.set('list', list);

    const toSec = (t: string) => {
      if (/^\d+$/.test(t)) return +t;
      let s = 0;
      const h = /(\d+)h/.exec(t)?.[1]; if (h) s += +h * 3600;
      const m = /(\d+)m/.exec(t)?.[1]; if (m) s += +m * 60;
      const sec = /(\d+)s/.exec(t)?.[1]; if (sec) s += +sec;
      return s;
    };
    const start = url.searchParams.get('start') || url.searchParams.get('t');
    const sec = start ? toSec(start) : 0;
    if (sec) qs.set('start', String(sec));

    const base = 'https://www.youtube-nocookie.com/embed/';
    return { src: base + id + (qs.toString() ? `?${qs}` : ''), id };
  } catch { return null; }
}
