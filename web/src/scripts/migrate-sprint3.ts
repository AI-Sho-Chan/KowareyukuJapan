import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrateSprint3() {
  console.log('🚀 Sprint 3 Migration - Starting...\n');
  
  try {
    // 1. feed_sources - 収集源管理
    console.log('1. Creating feed_sources table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS feed_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        type TEXT CHECK(type IN ('rss','atom','json')) NOT NULL,
        category TEXT,
        enabled INTEGER DEFAULT 1,
        check_interval_min INTEGER DEFAULT 15,
        last_checked_at INTEGER,
        error_count INTEGER DEFAULT 0,
        config_json TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);
    console.log('✓ Created feed_sources table');
    
    // 2. feed_items - 収集アイテム（原本ログ）
    console.log('\n2. Creating feed_items table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS feed_items (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        guid TEXT,
        title TEXT,
        url TEXT NOT NULL,
        published_at INTEGER,
        content TEXT,
        author TEXT,
        tags_json TEXT,
        status TEXT CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
        hash_url TEXT,
        hash_title TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY(source_id) REFERENCES feed_sources(id)
      )
    `);
    console.log('✓ Created feed_items table');
    
    // 3. posts - 既存テーブルの拡張
    console.log('\n3. Updating posts table...');
    
    // 新規カラムの追加（エラーを無視）
    const postsColumns = [
      { name: 'source_id', sql: 'ALTER TABLE posts ADD COLUMN source_id TEXT' },
      { name: 'type', sql: 'ALTER TABLE posts ADD COLUMN type TEXT' },
      { name: 'summary', sql: 'ALTER TABLE posts ADD COLUMN summary TEXT' },
      { name: 'thumbnail', sql: 'ALTER TABLE posts ADD COLUMN thumbnail TEXT' },
      { name: 'embed_status', sql: 'ALTER TABLE posts ADD COLUMN embed_status TEXT' },
      { name: 'probe_json', sql: 'ALTER TABLE posts ADD COLUMN probe_json TEXT' },
      { name: 'tags_json', sql: 'ALTER TABLE posts ADD COLUMN tags_json TEXT' },
      { name: 'status', sql: "ALTER TABLE posts ADD COLUMN status TEXT CHECK(status IN ('draft','published','hidden')) DEFAULT 'published'" },
      { name: 'published_at', sql: 'ALTER TABLE posts ADD COLUMN published_at INTEGER' },
    ];
    
    for (const col of postsColumns) {
      try {
        await db.execute(col.sql);
        console.log(`✓ Added ${col.name} column to posts`);
      } catch (e: any) {
        if (!e.message?.includes('duplicate column')) {
          console.error(`Failed to add ${col.name}:`, e.message);
        }
      }
    }
    
    // 4. events - イベント計測
    console.log('\n4. Creating events table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        type TEXT CHECK(type IN ('view','empathy','share')) NOT NULL,
        user_fp TEXT,
        ip_hash TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY(post_id) REFERENCES posts(id)
      )
    `);
    console.log('✓ Created events table');
    
    // 5. post_stats - 集計ビュー
    console.log('\n5. Creating post_stats table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS post_stats (
        post_id TEXT PRIMARY KEY,
        views INTEGER DEFAULT 0,
        empathies INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        last_event_at INTEGER,
        FOREIGN KEY(post_id) REFERENCES posts(id)
      )
    `);
    console.log('✓ Created post_stats table');
    
    // 6. trending_daily - 日次トレンド
    console.log('\n6. Creating trending_daily table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS trending_daily (
        date TEXT,
        post_id TEXT,
        score REAL,
        rank INTEGER,
        PRIMARY KEY(date, post_id),
        FOREIGN KEY(post_id) REFERENCES posts(id)
      )
    `);
    console.log('✓ Created trending_daily table');
    
    // 7. subscribers - ニュースレター購読者
    console.log('\n7. Creating subscribers table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscribers (
        email TEXT PRIMARY KEY,
        status TEXT CHECK(status IN ('pending','active','unsubscribed')) NOT NULL,
        token TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);
    console.log('✓ Created subscribers table');
    
    // 8. newsletter_logs - ニュースレター送信ログ
    console.log('\n8. Creating newsletter_logs table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS newsletter_logs (
        id TEXT PRIMARY KEY,
        subject TEXT,
        html_size INTEGER,
        sent_count INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      )
    `);
    console.log('✓ Created newsletter_logs table');
    
    // 9. feed_logs - 収集ログ
    console.log('\n9. Creating feed_logs table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS feed_logs (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        items_found INTEGER DEFAULT 0,
        items_new INTEGER DEFAULT 0,
        duration_ms INTEGER,
        error TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY(source_id) REFERENCES feed_sources(id)
      )
    `);
    console.log('✓ Created feed_logs table');
    
    // 10. インデックスの作成
    console.log('\n10. Creating indexes for performance...');
    
    const indexes = [
      // feed_items
      'CREATE INDEX IF NOT EXISTS idx_feed_items_source ON feed_items(source_id)',
      'CREATE INDEX IF NOT EXISTS idx_feed_items_status ON feed_items(status)',
      'CREATE INDEX IF NOT EXISTS idx_feed_items_hash_url ON feed_items(hash_url)',
      'CREATE INDEX IF NOT EXISTS idx_feed_items_created ON feed_items(created_at DESC)',
      
      // posts
      'CREATE INDEX IF NOT EXISTS idx_posts_source ON posts(source_id)',
      'CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)',
      'CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC)',
      
      // events
      'CREATE INDEX IF NOT EXISTS idx_events_post ON events(post_id)',
      'CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)',
      'CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_fp)',
      'CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC)',
      
      // post_stats
      'CREATE INDEX IF NOT EXISTS idx_post_stats_views ON post_stats(views DESC)',
      'CREATE INDEX IF NOT EXISTS idx_post_stats_empathies ON post_stats(empathies DESC)',
      'CREATE INDEX IF NOT EXISTS idx_post_stats_shares ON post_stats(shares DESC)',
      
      // trending_daily
      'CREATE INDEX IF NOT EXISTS idx_trending_date ON trending_daily(date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_trending_score ON trending_daily(score DESC)',
      
      // feed_logs
      'CREATE INDEX IF NOT EXISTS idx_feed_logs_source ON feed_logs(source_id)',
      'CREATE INDEX IF NOT EXISTS idx_feed_logs_created ON feed_logs(created_at DESC)',
    ];
    
    for (const indexSql of indexes) {
      try {
        await db.execute(indexSql);
        const indexName = indexSql.match(/idx_\w+/)?.[0];
        console.log(`✓ Created index: ${indexName}`);
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          console.error(`Failed to create index:`, e.message);
        }
      }
    }
    
    // 11. サンプルフィードの挿入
    console.log('\n11. Inserting sample feed sources...');
    
    const sampleFeeds = [
      {
        id: 'yahoo-news-main',
        name: 'Yahoo!ニュース - 主要',
        url: 'https://news.yahoo.co.jp/rss/media/all/all.xml',
        type: 'rss',
        category: 'news',
        enabled: 1,
        check_interval_min: 15,
      },
      {
        id: 'nhk-news',
        name: 'NHKニュース',
        url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
        type: 'rss',
        category: 'news',
        enabled: 1,
        check_interval_min: 30,
      },
      {
        id: 'sankei-opinion',
        name: '産経新聞 - オピニオン',
        url: 'https://www.sankei.com/rss/column/opinion.xml',
        type: 'rss',
        category: 'opinion',
        enabled: 1,
        check_interval_min: 60,
      },
    ];
    
    for (const feed of sampleFeeds) {
      try {
        await db.execute({
          sql: `INSERT OR IGNORE INTO feed_sources (id, name, url, type, category, enabled, check_interval_min) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [feed.id, feed.name, feed.url, feed.type, feed.category, feed.enabled, feed.check_interval_min],
        });
        console.log(`✓ Added feed source: ${feed.name}`);
      } catch (e) {
        console.error(`Failed to add feed ${feed.name}:`, e);
      }
    }
    
    console.log('\n✅ Sprint 3 migration completed successfully!');
    
    // 統計情報の表示
    console.log('\n📊 Database Statistics:');
    
    const tables = [
      'feed_sources',
      'feed_items',
      'posts',
      'events',
      'post_stats',
      'trending_daily',
      'subscribers',
      'newsletter_logs',
      'feed_logs',
    ];
    
    for (const table of tables) {
      try {
        const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result.rows[0]?.count || 0;
        console.log(`   ${table}: ${count} records`);
      } catch (e) {
        console.log(`   ${table}: (error reading)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// 実行
migrateSprint3();