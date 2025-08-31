import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractChannelId(input: string): string | null {
  const v = input.trim();
  if (/^[A-Za-z0-9_-]{16,}$/.test(v)) return v; // likely ID
  try {
    const u = new URL(v);
    // e.g., https://www.youtube.com/channel/UCxxxx or /@handle -> cannot resolve handle here
    const m = u.pathname.match(/\/channel\/([A-Za-z0-9_-]{16,})/);
    if (m) return m[1];
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(()=>({}));
    const raw = String(body.channel || body.channelId || body.url || '').trim();
    const name = String(body.name || '').trim();
    const limitPerHour = Math.max(1, Math.min(10, Number(body.maxPerHour || 1)));
    const chId = extractChannelId(raw);
    if (!chId) return NextResponse.json({ ok:false, error:'invalid channel' }, { status:400 });

    const db = createClient({ url: process.env.TURSO_DB_URL || 'file:local.db', authToken: process.env.TURSO_AUTH_TOKEN });
    const id = `youtube-${chId}`;
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${chId}`;

    await db.execute({
      sql: `INSERT INTO feed_sources (id, name, url, type, category, enabled, check_interval_min, config_json, created_at, updated_at)
            VALUES (?, ?, ?, 'rss', 'youtube', 1, ?, ?, unixepoch(), unixepoch())
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, url=excluded.url, enabled=1, check_interval_min=excluded.check_interval_min, config_json=excluded.config_json, updated_at=unixepoch()`,
      args: [id, name || `YouTube ${chId}`, url, 30, JSON.stringify({ channel_name: name || chId, max_per_hour: limitPerHour })]
    });

    return NextResponse.json({ ok:true, id, url });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status:500 });
  }
}
