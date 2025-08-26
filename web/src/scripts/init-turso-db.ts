import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function initializeTursoDB() {
  console.log('Initializing Turso database...');
  
  const db = createClient({
    url: process.env.TURSO_DB_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  });

  // Create tables
  const tables = [
    `CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      owner_key TEXT,
      url TEXT,
      comment TEXT,
      tags TEXT,
      media_type TEXT,
      media_data BLOB,
      metadata_json TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )`,
    
    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      author_name TEXT,
      author_key TEXT,
      content TEXT,
      ip_hash TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT,
      resource_type TEXT,
      resource_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      metadata_json TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    
    `CREATE TABLE IF NOT EXISTS stats (
      id TEXT PRIMARY KEY,
      metric TEXT,
      value INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    
    `CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE,
      count INTEGER DEFAULT 0,
      window_start INTEGER,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
  ];

  try {
    for (const sql of tables) {
      console.log(`Creating table: ${sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1]}`);
      await db.execute(sql);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_posts_owner_key ON posts(owner_key)',
      'CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key)',
    ];

    for (const sql of indexes) {
      console.log(`Creating index: ${sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/)?.[1]}`);
      await db.execute(sql);
    }

    // Insert initial demo data
    const demoData = [
      {
        id: 'demo-1',
        owner_key: 'ADMIN_OPERATOR',
        url: 'https://www.sankei.com/',
        comment: 'サイト開設記念。日本を守るための情報共有プラットフォームとして活用してください。',
        tags: JSON.stringify(['ニュース', '日本']),
        created_at: Math.floor(Date.now() / 1000) - 86400
      },
      {
        id: 'demo-2',
        owner_key: 'demo-user-1',
        url: 'https://www.youtube.com/watch?v=example',
        comment: '日本の伝統文化について解説した動画です。',
        tags: JSON.stringify(['動画', '日本']),
        created_at: Math.floor(Date.now() / 1000) - 43200
      },
      {
        id: 'demo-3',
        owner_key: 'demo-user-2',
        url: 'https://news.yahoo.co.jp/',
        comment: '最新の政治・経済ニュースをチェック。',
        tags: JSON.stringify(['ニュース', '政治/制度']),
        created_at: Math.floor(Date.now() / 1000) - 3600
      }
    ];

    for (const post of demoData) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO posts (id, owner_key, url, comment, tags, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [post.id, post.owner_key, post.url, post.comment, post.tags, post.created_at, post.created_at]
      });
    }

    console.log('✅ Turso database initialized successfully!');
    
    // Verify the data
    const result = await db.execute('SELECT COUNT(*) as count FROM posts');
    console.log(`Total posts in database: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeTursoDB()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default initializeTursoDB;