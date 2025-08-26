import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addCommentsTable() {
  console.log('🔄 commentsテーブルを作成中...');

  try {
    // commentsテーブルを作成
    await db.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        author_name TEXT NOT NULL DEFAULT '名無しさん',
        author_key TEXT,
        content TEXT NOT NULL,
        ip_hash TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ commentsテーブルを作成しました');
    
    // インデックスを作成
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_comments_author_key ON comments(author_key)
    `);
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC)
    `);
    console.log('✅ インデックスを作成しました');
    
    console.log('\n📊 コメントテーブルの作成完了！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

addCommentsTable().catch(console.error);