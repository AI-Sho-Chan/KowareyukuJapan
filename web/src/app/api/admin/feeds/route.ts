import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: フィード一覧取得
export async function GET(request: NextRequest) {
  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const feeds = await db.execute(`
      SELECT * FROM feed_sources 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      ok: true,
      feeds: feeds.rows,
    });
  } catch (error: any) {
    console.error('Failed to fetch feeds:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: 新規フィード追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, type = 'rss', category = 'general', check_interval_min = 30 } = body;

    if (!name || !url) {
      return NextResponse.json(
        { ok: false, error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const id = crypto.randomUUID();
    
    await db.execute({
      sql: `INSERT INTO feed_sources (
        id, name, url, type, category, enabled, check_interval_min
      ) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      args: [id, name, url, type, category, check_interval_min],
    });

    return NextResponse.json({
      ok: true,
      id,
    });
  } catch (error: any) {
    console.error('Failed to add feed:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}