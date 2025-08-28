import { createClient } from '@libsql/client';

async function initTursoDB() {
  try {
    console.log('Turso DB初期化を開始...');
    
    // 環境変数の確認
    const dbUrl = process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    console.log('DB URL:', dbUrl ? dbUrl.substring(0, 30) + '...' : 'NOT_SET');
    console.log('Auth Token exists:', !!authToken);
    
    if (!dbUrl || dbUrl === 'file:local.db') {
      throw new Error('TURSO_DB_URLが正しく設定されていません');
    }
    
    if (!authToken) {
      throw new Error('TURSO_AUTH_TOKENが設定されていません');
    }
    
    // Turso DBクライアント初期化
    const db = createClient({
      url: dbUrl,
      authToken: authToken
    });
    
    console.log('DBクライアント初期化完了');
    
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
    
    console.log('スキーマ実行中...');
    await db.execute(schema);
    console.log('スキーマ作成完了');
    
    // サンプルデータ挿入
    const samplePosts = [
      {
        id: 'demo-1',
        url: 'https://news.yahoo.co.jp/',
        comment: '最新の政治・経済ニュースをチェック。',
        tags: JSON.stringify(['ニュース', '政治/制度']),
        owner_key: 'demo',
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'demo-2',
        url: 'https://www.youtube.com/watch?v=example',
        comment: '日本の伝統文化について解説した動画です。',
        tags: JSON.stringify(['動画', '日本']),
        owner_key: 'demo',
        created_at: Date.now(),
        updated_at: Date.now()
      },
      {
        id: 'demo-3',
        url: 'https://www.sankei.com/',
        comment: 'サイト開設記念。日本を守るための情報共有プラットフォームとして活用してください。',
        tags: JSON.stringify(['ニュース', '日本']),
        owner_key: 'demo',
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ];
    
    console.log('サンプルデータ挿入中...');
    for (const post of samplePosts) {
      await db.execute({
        sql: 'INSERT OR IGNORE INTO posts (id, url, comment, tags, owner_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [post.id, post.url, post.comment, post.tags, post.owner_key, post.created_at, post.updated_at]
      });
    }
    console.log('サンプルデータ挿入完了');
    
    console.log('✅ Turso DB初期化が完了しました！');
    console.log(`📊 挿入された投稿数: ${samplePosts.length}`);
    
  } catch (error) {
    console.error('❌ Turso DB初期化に失敗しました:', error);
    process.exit(1);
  }
}

initTursoDB();