import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// データベース接続
const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 既存のJSONファイルのパス
const POSTS_FILE = path.join(process.cwd(), '.data', 'posts.json');
const MEDIA_DIR = path.join(process.cwd(), '.data', 'media');

interface OldPost {
  id: string;
  title?: string;
  url?: string;
  comment?: string;
  handle?: string;
  ownerKey: string;
  tags?: string[];
  createdAt: number;
  media?: {
    type: 'image' | 'video';
    url: string;
  };
}

async function initializeSchema() {
  console.log('Initializing database schema...');
  
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      await db.execute(statement + ';');
    } catch (error: any) {
      // Ignore "already exists" errors
      if (!error.message?.includes('already exists')) {
        console.error('Schema error:', error.message);
      }
    }
  }
  
  console.log('Schema initialized');
}

async function migrateData() {
  console.log('Starting data migration...');
  
  // Read existing posts
  if (!fs.existsSync(POSTS_FILE)) {
    console.log('No posts.json file found. Nothing to migrate.');
    return;
  }
  
  const postsData = fs.readFileSync(POSTS_FILE, 'utf8');
  const posts: OldPost[] = JSON.parse(postsData);
  
  console.log(`Found ${posts.length} posts to migrate`);
  
  let migratedCount = 0;
  let skippedCount = 0;
  
  for (const post of posts) {
    try {
      // Check if post already exists
      const existing = await db.execute({
        sql: 'SELECT id FROM posts WHERE id = ?',
        args: [post.id]
      });
      
      if (existing.rows.length > 0) {
        console.log(`Post ${post.id} already exists, skipping`);
        skippedCount++;
        continue;
      }
      
      // Convert timestamp to ISO string
      const createdAt = new Date(post.createdAt).toISOString();
      
      // Insert post
      await db.execute({
        sql: `INSERT INTO posts (
          id, title, url, comment, handle, owner_key, 
          created_at, updated_at, is_published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          post.id,
          post.title || null,
          post.url || null,
          post.comment || null,
          post.handle || '@guest',
          post.ownerKey,
          createdAt,
          createdAt,
          1 // All existing posts are published
        ]
      });
      
      // Insert tags
      if (post.tags && post.tags.length > 0) {
        for (const tagName of post.tags) {
          // Get tag ID
          const tagResult = await db.execute({
            sql: 'SELECT id FROM tags WHERE name = ?',
            args: [tagName]
          });
          
          if (tagResult.rows.length > 0) {
            const tagId = tagResult.rows[0].id;
            
            // Insert post-tag relationship
            await db.execute({
              sql: 'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
              args: [post.id, tagId]
            });
          }
        }
      }
      
      // Insert media if exists
      if (post.media) {
        const mediaId = `${post.id}_media`;
        
        await db.execute({
          sql: `INSERT INTO media (
            id, post_id, type, url, created_at
          ) VALUES (?, ?, ?, ?, ?)`,
          args: [
            mediaId,
            post.id,
            post.media.type,
            post.media.url,
            createdAt
          ]
        });
      }
      
      migratedCount++;
      console.log(`✓ Migrated post ${post.id}: ${post.title || '(untitled)'}`);
      
    } catch (error) {
      console.error(`✗ Failed to migrate post ${post.id}:`, error);
    }
  }
  
  console.log(`\nMigration completed:`);
  console.log(`  - Migrated: ${migratedCount} posts`);
  console.log(`  - Skipped: ${skippedCount} posts`);
  console.log(`  - Failed: ${posts.length - migratedCount - skippedCount} posts`);
}

async function verifyMigration() {
  console.log('\nVerifying migration...');
  
  const result = await db.execute('SELECT COUNT(*) as count FROM posts');
  const count = result.rows[0].count;
  
  console.log(`Total posts in database: ${count}`);
  
  // Show sample posts
  const sample = await db.execute({
    sql: 'SELECT id, title, created_at FROM posts ORDER BY created_at DESC LIMIT 5'
  });
  
  console.log('\nLatest 5 posts:');
  for (const row of sample.rows) {
    console.log(`  - ${row.id}: ${row.title || '(untitled)'}`);
  }
}

async function main() {
  try {
    console.log('=== Starting Database Migration ===\n');
    
    await initializeSchema();
    await migrateData();
    await verifyMigration();
    
    console.log('\n=== Migration Complete ===');
    console.log('You can now update the API to use the database.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();