import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { appendLog, loadTopics, saveTopics, AutoTopic } from '@/lib/auto-topics';
import { PostsRepository } from '@/lib/db/posts-repository';
import { fetchYouTubeChannelRSS, fetchYouTubeVideos } from '@/lib/feed/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

type PrefChannel = { name: string; channelId?: string };

const PREF_CHANNELS: PrefChannel[] = [
  { name: '高橋洋一チャンネル', channelId: 'UC6ag81wMs4pnJjLuSJDzuVA' },
  { name: '文化人放送局', channelId: 'UC7dXPammhcS6lrPzgq7WAPQ' },
  { name: '山口敬之チャンネル', channelId: 'UCpAjmHTwvOQq1_wachYdnwg' },
  { name: '真相深入り！虎ノ門ニュース', channelId: 'UCHk5mAXPuNWTXBaU0mSvhGg' },
];

async function resolveChannelIdIfNeeded(ch: PrefChannel): Promise<string | undefined> {
  if (ch.channelId) return ch.channelId;
  const apiKey = process.env.YOUTUBE_API_KEY || '';
  if (!apiKey) return undefined;
  try {
    const res = await fetchYouTubeVideos(apiKey, undefined, ch.name, 1);
    const vid = res?.[0];
    return vid?.channelId;
  } catch { return undefined; }
}

export async function GET(req: NextRequest){
  if (!verifyCronRequest(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
  const db = createClient({ url: process.env.TURSO_DB_URL || 'file:local.db', authToken: process.env.TURSO_AUTH_TOKEN });
  const postsRepo = new PostsRepository();

  try {
    const hourAgoIso = new Date(Date.now() - 60*60*1000).toISOString();
    const recent = await db.execute({ sql: `SELECT id FROM posts WHERE owner_key = 'ADMIN_OPERATOR' AND url LIKE '%youtube.com%' AND created_at > ? LIMIT 1`, args: [hourAgoIso] });
    if (recent.rows.length > 0) { appendLog('skip: rate_limit'); return NextResponse.json({ ok:true, skipped:'rate_limit' }); }
  } catch {}

  // 1) Try priority channels via RSS
  for (const ch of PREF_CHANNELS) {
    const cid = await resolveChannelIdIfNeeded(ch);
    if (!cid) continue;
    const videos = await fetchYouTubeChannelRSS(cid);
    for (const v of videos) {
      const watchUrl = `https://www.youtube.com/watch?v=${v.id}`;
      const exists = await db.execute({ sql: `SELECT id FROM posts WHERE url = ? OR url = ? LIMIT 1`, args: [watchUrl, `https://youtu.be/${v.id}`] });
      if (exists.rows.length > 0) continue;
      try {
        await postsRepo.createPost({
          title: v.title,
          url: watchUrl,
          comment: undefined,
          handle: '@運営',
          ownerKey: 'ADMIN_OPERATOR',
          tags: ['動画','ニュース'],
          media: undefined,
        });
        appendLog(`post: ${ch.name} | ${v.title} | ${watchUrl}`);
        return NextResponse.json({ ok:true, posted: { channel: ch.name, title: v.title, url: watchUrl } });
      } catch (e:any) {
        appendLog(`error: ${ch.name} | ${String(e?.message||e)}`);
        return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
      }
    }
  }

  // 2) Try saved auto-topics via YouTube Data API searches
  const apiKey = process.env.YOUTUBE_API_KEY || '';
  if (apiKey) {
    const topics = loadTopics().filter(t => t.enabled !== false);
    for (const t of topics) {
      // min interval check
      const minMs = Math.max(10, t.minIntervalMinutes || 60) * 60 * 1000;
      if (t.lastPostedAt && Date.now() - t.lastPostedAt < minMs) {
        appendLog(`skip_topic: rate_limit ${t.keyword}`);
        continue;
      }
      try {
        const vids = await fetchYouTubeVideos(apiKey, undefined, t.keyword, 3);
        for (const v of vids) {
          const watchUrl = `https://www.youtube.com/watch?v=${v.id}`;
          const exists = await db.execute({ sql: `SELECT id FROM posts WHERE url = ? OR url = ? LIMIT 1`, args: [watchUrl, `https://youtu.be/${v.id}`] });
          if (exists.rows.length > 0) continue;
          await postsRepo.createPost({
            title: v.title,
            url: watchUrl,
            comment: undefined,
            handle: '@運営',
            ownerKey: 'ADMIN_OPERATOR',
            tags: ['動画','ニュース'],
            media: undefined,
          });
          appendLog(`topic_post: ${t.keyword} | ${v.title} | ${watchUrl}`);
          // persist lastPostedAt
          t.lastPostedAt = Date.now();
          try { saveTopics(topics as AutoTopic[]); } catch {}
          return NextResponse.json({ ok:true, posted: { topic: t.keyword, title: v.title, url: watchUrl } });
        }
        appendLog(`skip_topic: no_match ${t.keyword}`);
      } catch (e:any) {
        appendLog(`error_topic: ${t.keyword} | ${String(e?.message||e)}`);
      }
    }
  } else {
    appendLog('skip: missing YOUTUBE_API_KEY for topics');
  }

  appendLog('skip: no_new_video');
  return NextResponse.json({ ok:true, posted: null, reason: 'no_new_video' });
}
