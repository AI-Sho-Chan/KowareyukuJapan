import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addSecurityColumns() {
  console.log('Adding security columns to database...');
  
  try {
    // postsテーブルに新しいカラムを追加
    const columnsToAdd = [
      { name: 'auto_hidden', type: 'BOOLEAN DEFAULT 0' },
      { name: 'auto_hidden_at', type: 'DATETIME' },
      { name: 'content_hash', type: 'TEXT' },
    ];
    
    for (const column of columnsToAdd) {
      try {
        await db.execute(`ALTER TABLE posts ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✓ Added column: ${column.name}`);
      } catch (error: any) {
        if (error.message?.includes('duplicate column')) {
          console.log(`Column ${column.name} already exists`);
        } else {
          console.error(`Failed to add column ${column.name}:`, error.message);
        }
      }
    }
    
    // admin_notifications テーブル作成
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        post_id TEXT,
        report_count INTEGER,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created admin_notifications table');
    
    // ip_geo_cache テーブル作成
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ip_geo_cache (
        ip TEXT PRIMARY KEY,
        country_code TEXT,
        is_vpn BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created ip_geo_cache table');
    
    // device_fingerprints テーブル作成
    await db.execute(`
      CREATE TABLE IF NOT EXISTS device_fingerprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fingerprint TEXT NOT NULL,
        owner_key TEXT NOT NULL,
        ip_address TEXT,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(fingerprint, owner_key)
      )
    `);
    console.log('✓ Created device_fingerprints table');
    
    console.log('\n✓ Security columns and tables added successfully');
    
  } catch (error) {
    console.error('Error adding security columns:', error);
    process.exit(1);
  }
}

addSecurityColumns();