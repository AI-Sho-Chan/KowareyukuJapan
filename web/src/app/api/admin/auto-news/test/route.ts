import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { fetchYouTubeVideos } from '@/lib/feed/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
  const q = req.nextUrl.searchParams.get('q') || '';
  const apiKey = process.env.YOUTUBE_API_KEY || '';
  if (!q) return NextResponse.json({ ok:false, error:'q required' }, { status:400 });
  if (!apiKey) return NextResponse.json({ ok:false, error:'YOUTUBE_API_KEY missing' }, { status:500 });
  const vids = await fetchYouTubeVideos(apiKey, undefined, q, 5);
  return NextResponse.json({ ok:true, items: vids });
}

