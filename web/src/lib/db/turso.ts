import { createClient } from '@libsql/client';

let dbInstance: ReturnType<typeof createClient> | null = null;

export function getDatabase() {
  if (!dbInstance) {
    const isProd = process.env.NODE_ENV === 'production';
    
    // Production: Use Turso DB if configured, otherwise use in-memory DB
    if (isProd && process.env.TURSO_DB_URL && process.env.TURSO_DB_URL !== 'file:local.db') {
      dbInstance = createClient({
        url: process.env.TURSO_DB_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      // Development or fallback: Use in-memory SQLite
      dbInstance = createClient({
        url: ':memory:',
      });
      
      // Initialize tables for in-memory database
      initializeInMemoryDb(dbInstance);
    }
  }
  
  return dbInstance;
}

async function initializeInMemoryDb(db: ReturnType<typeof createClient>) {
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
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      author_name TEXT,
      author_key TEXT,
      content TEXT,
      ip_hash TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
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
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS stats (
      id TEXT PRIMARY KEY,
      metric TEXT,
      value INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS rate_limits (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE,
      count INTEGER DEFAULT 0,
      window_start INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
  ];

  try {
    for (const sql of tables) {
      await db.execute(sql);
    }
    console.log('In-memory database initialized');
  } catch (error) {
    console.error('Failed to initialize in-memory database:', error);
  }
}

export default getDatabase;