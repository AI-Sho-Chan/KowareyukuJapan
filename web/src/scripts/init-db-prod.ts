import { createClient } from '@libsql/client';

async function initializeProductionDb() {
  const db = createClient({
    url: process.env.TURSO_DB_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Create tables if they don't exist
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
      created_at INTEGER,
      updated_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      author_name TEXT,
      author_key TEXT,
      content TEXT,
      ip_hash TEXT,
      created_at INTEGER,
      updated_at INTEGER,
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
      created_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS stats (
      id TEXT PRIMARY KEY,
      metric TEXT,
      value INTEGER,
      created_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY,
      key TEXT,
      count INTEGER,
      window_start INTEGER,
      created_at INTEGER
    )`,
  ];

  for (const sql of tables) {
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
    await db.execute(sql);
  }

  console.log('Production database initialized successfully');
}

initializeProductionDb().catch(console.error);