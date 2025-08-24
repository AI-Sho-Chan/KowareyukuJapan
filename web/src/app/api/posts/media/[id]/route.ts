import { mediaStore } from "@/lib/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }){
  const { id } = await params;
  const media = mediaStore.get(id);
  if(!media) return new Response('Not Found',{status:404});
  return new Response(media.data, { headers: { 'content-type': media.contentType, 'cache-control': 'public, max-age=31536000, immutable' } });
}


