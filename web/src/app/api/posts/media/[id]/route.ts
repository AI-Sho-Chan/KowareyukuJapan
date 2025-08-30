import { loadMediaFromDisk, mediaStore } from "@/lib/store";

// Ensure Node.js runtime for streaming + fs access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }){
  const { id } = params;
  const range = (req.headers as any).get?.('range') as string | null || null;
  let media = mediaStore.get(id) || loadMediaFromDisk(id);
  if(!media) return new Response('Not Found',{status:404});

  const baseHeaders: Record<string,string> = {
    'content-type': media.contentType,
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'accept-ranges': 'bytes',
  };

  const buf = media.data;
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d+)?/);
    if (m) {
      const start = Number(m[1]);
      const end = Math.min(buf.length - 1, m[2] ? Number(m[2]) : buf.length - 1);
      if (start >= buf.length || start < 0) {
        return new Response(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            'content-range': `bytes */${buf.length}`,
          }
        });
      }
      const chunk = buf.subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          ...baseHeaders,
          'content-range': `bytes ${start}-${end}/${buf.length}`,
          'content-length': String(chunk.length),
        },
      });
    }
  }
  return new Response(buf, { headers: { ...baseHeaders, 'content-length': String(buf.length) } });
}


