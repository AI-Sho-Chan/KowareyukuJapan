export function toYTEmbed(u: string): { src: string; id: string } | null {
  try {
    const url = new URL(u);
    let id: string | null = null;

    if (url.hostname === 'youtu.be') {
      id = url.pathname.slice(1);
    } else if (url.hostname.endsWith('youtube.com')) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2];
      else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2];
    }
    if (!id) return null;

    const qs = new URLSearchParams();
    const list = url.searchParams.get('list');
    if (list) qs.set('list', list);

    const toSec = (t: string) => {
      if (/^\d+$/.test(t)) return Number(t);
      let s = 0;
      const h = /(\d+)h/.exec(t)?.[1]; if (h) s += Number(h) * 3600;
      const m = /(\d+)m/.exec(t)?.[1]; if (m) s += Number(m) * 60;
      const sec = /(\d+)s/.exec(t)?.[1]; if (sec) s += Number(sec);
      return s;
    };
    const start = url.searchParams.get('start') || url.searchParams.get('t');
    const sec = start ? toSec(start) : 0;
    if (sec) qs.set('start', String(sec));

    const base = 'https://www.youtube-nocookie.com/embed/';
    const src = base + id + (qs.toString() ? `?${qs.toString()}` : '');
    return { src, id };
  } catch { return null; }
}
