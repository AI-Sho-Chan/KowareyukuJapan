import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function POST(req: NextRequest) {
  try {
    // 管理者認証チェック
    const authHeader = req.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_SECRET_KEY;
    
    // 開発用フォールバック（dev-token）も許可
    if (!authHeader || (authHeader !== expectedKey && authHeader !== 'dev-token')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Turso DBクライアント初期化
    const db = createClient({
      url: process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL || '',
      authToken: process.env.TURSO_AUTH_TOKEN || ''
    });

    // スキーマ作成
    const schema = `
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        comment TEXT,
        handle TEXT,
        tags TEXT,
        metadata_json TEXT,
        owner_key TEXT,
        is_published BOOLEAN DEFAULT true,
        report_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feeds (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT,
        is_active BOOLEAN DEFAULT true,
        last_fetch INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_is_published ON posts(is_published);
      CREATE INDEX IF NOT EXISTS idx_feeds_is_active ON feeds(is_active);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    `;

    // スキーマ実行
    await db.execute(schema);
    
    // サンプルデータ挿入（オプション）
    const samplePosts = [
      {
        id: '1',
        url: 'https://example.com/news1',
        comment: '日本の伝統文化を守ることの重要性について',
        tags: JSON.stringify(['ニュース', '日本']),
        owner_key: 'demo',
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];

    for (const post of samplePosts) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO posts (id, url, comment, tags, owner_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [post.id, post.url, post.comment, post.tags, post.owner_key, post.created_at, post.updated_at]
      });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'データベースの初期化が完了しました',
      postsCount: samplePosts.length
    });

  } catch (error: any) {
    console.error('DB initialization error:', error);
    return NextResponse.json({ 
      error: 'データベース初期化に失敗しました',
      message: error.message 
    }, { status: 500 });
  }
}