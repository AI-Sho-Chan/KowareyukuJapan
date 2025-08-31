import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const postsBySource = await db.execute(
      `SELECT source_id, COUNT(*) AS c FROM posts WHERE source_id IS NOT NULL GROUP BY source_id`
    );
    const itemsBySource = await db.execute(
      `SELECT source_id, COUNT(*) AS c FROM feed_items GROUP BY source_id`
    );

    const posted: Record<string, number> = {};
    for (const r of postsBySource.rows as any[]) {
      if (!r?.source_id) continue; posted[String(r.source_id)] = Number(r.c || 0);
    }
    const collected: Record<string, number> = {};
    for (const r of itemsBySource.rows as any[]) {
      if (!r?.source_id) continue; collected[String(r.source_id)] = Number(r.c || 0);
    }

    return NextResponse.json({ ok: true, posted, collected });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

