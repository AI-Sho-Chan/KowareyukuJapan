import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  console.log('Checking existing tables...\n');
  
  try {
    // Check existing tables
    const tables = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    console.log('Existing tables:');
    for (const table of tables.rows) {
      console.log(`  - ${table.name}`);
    }
    
    // Check if critical Sprint 3 tables exist
    const sprint3Tables = [
      'feed_sources',
      'feed_items',
      'events',
      'post_stats',
      'trending_daily',
      'comments'
    ];
    
    console.log('\nSprint 3 tables status:');
    for (const tableName of sprint3Tables) {
      const result = await db.execute({
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
        args: [tableName]
      });
      
      const exists = result.rows.length > 0;
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
    }
    
    // Check posts table structure
    console.log('\nPosts table columns:');
    const postsInfo = await db.execute(`PRAGMA table_info(posts)`);
    for (const col of postsInfo.rows) {
      console.log(`  - ${col.name} (${col.type})`);
    }
    
  } catch (err) {
    console.error('Error checking schemas:', err?.message || err);
    process.exitCode = 1;
  }
})();