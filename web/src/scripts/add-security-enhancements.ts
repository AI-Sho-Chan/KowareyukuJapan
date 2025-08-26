import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addSecurityEnhancements() {
  console.log('Adding security enhancement tables and columns...');
  
  try {
    // 1. admin_notifications テーブル拡張
    console.log('\n1. Updating admin_notifications table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT,
        post_id TEXT,
        report_count INTEGER,
        message TEXT NOT NULL,
        details TEXT,
        priority TEXT DEFAULT 'normal',
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // titleカラムを追加（既存テーブル用）
    try {
      await db.execute(`ALTER TABLE admin_notifications ADD COLUMN title TEXT`);
      console.log('✓ Added title column to admin_notifications');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) {
        console.error('Failed to add title column:', e.message);
      }
    }
    
    // detailsカラムを追加
    try {
      await db.execute(`ALTER TABLE admin_notifications ADD COLUMN details TEXT`);
      console.log('✓ Added details column to admin_notifications');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) {
        console.error('Failed to add details column:', e.message);
      }
    }
    
    // priorityカラムを追加
    try {
      await db.execute(`ALTER TABLE admin_notifications ADD COLUMN priority TEXT DEFAULT 'normal'`);
      console.log('✓ Added priority column to admin_notifications');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) {
        console.error('Failed to add priority column:', e.message);
      }
    }
    
    // 2. NGワードヒット履歴テーブル
    console.log('\n2. Creating ng_word_hits table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ng_word_hits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        detected_words TEXT NOT NULL,
        blocked_languages TEXT,
        content TEXT,
        owner_key TEXT,
        ip_address TEXT,
        action_taken TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created ng_word_hits table');
    
    // 3. デバイスフィンガープリント拡張
    console.log('\n3. Updating device_fingerprints table...');
    try {
      await db.execute(`ALTER TABLE device_fingerprints ADD COLUMN threat_score INTEGER DEFAULT 0`);
      console.log('✓ Added threat_score column');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) {
        console.error('Failed to add threat_score column:', e.message);
      }
    }
    
    try {
      await db.execute(`ALTER TABLE device_fingerprints ADD COLUMN user_agent TEXT`);
      console.log('✓ Added user_agent column');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column')) {
        console.error('Failed to add user_agent column:', e.message);
      }
    }
    
    // 4. VPN検出履歴テーブル
    console.log('\n4. Creating vpn_detection_logs table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vpn_detection_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        is_vpn BOOLEAN DEFAULT 0,
        detection_method TEXT,
        confidence_score REAL,
        asn INTEGER,
        org TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created vpn_detection_logs table');
    
    // 5. セキュリティイベントテーブル
    console.log('\n5. Creating security_events table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        source_ip TEXT,
        target_id TEXT,
        target_type TEXT,
        description TEXT,
        metadata TEXT,
        handled BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created security_events table');
    
    // 6. 自動化アクションログ
    console.log('\n6. Creating automation_logs table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        trigger TEXT NOT NULL,
        target_id TEXT,
        target_type TEXT,
        result TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created automation_logs table');
    
    // 7. インデックスの作成
    console.log('\n7. Creating indexes for performance...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read)',
      'CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_ng_word_hits_ip ON ng_word_hits(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_ng_word_hits_owner ON ng_word_hits(owner_key)',
      'CREATE INDEX IF NOT EXISTS idx_device_fingerprints_threat ON device_fingerprints(threat_score)',
      'CREATE INDEX IF NOT EXISTS idx_vpn_detection_ip ON vpn_detection_logs(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity)',
      'CREATE INDEX IF NOT EXISTS idx_automation_logs_type ON automation_logs(action_type)',
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
    
    // 8. 設定テーブル
    console.log('\n8. Creating configuration table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS security_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created security_config table');
    
    // デフォルト設定の挿入
    const defaultConfigs = [
      ['report_threshold', '3', '管理者通知を行う報告数の閾値'],
      ['auto_hide_threshold', '10', '自動非公開を行う報告数の閾値'],
      ['rate_limit_posts', '3', '5分間の投稿制限数'],
      ['rate_limit_window', '300', '投稿制限のウィンドウ（秒）'],
      ['block_duration', '1800', 'レート制限違反時のブロック期間（秒）'],
      ['vpn_detection_enabled', 'true', 'VPN検出の有効/無効'],
      ['geo_block_enabled', 'true', '地理的ブロックの有効/無効'],
      ['ng_word_filter_v2', 'true', '強化版NGワードフィルターの使用'],
      ['notification_email_enabled', 'false', 'Email通知の有効/無効'],
      ['notification_line_enabled', 'false', 'LINE通知の有効/無効'],
    ];
    
    for (const [key, value, desc] of defaultConfigs) {
      try {
        await db.execute({
          sql: `INSERT OR IGNORE INTO security_config (config_key, config_value, description) VALUES (?, ?, ?)`,
          args: [key, value, desc],
        });
        console.log(`✓ Added config: ${key}`);
      } catch (e) {
        console.error(`Failed to add config ${key}:`, e);
      }
    }
    
    console.log('\n✅ Security enhancements added successfully!');
    
    // 統計情報の表示
    console.log('\n📊 Database Statistics:');
    
    const tables = [
      'admin_notifications',
      'ng_word_hits',
      'device_fingerprints',
      'vpn_detection_logs',
      'security_events',
      'automation_logs',
      'security_config',
    ];
    
    for (const table of tables) {
      try {
        const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result.rows[0]?.count || 0;
        console.log(`   ${table}: ${count} records`);
      } catch (e) {
        console.log(`   ${table}: (new table)`);
      }
    }
    
  } catch (error) {
    console.error('Error adding security enhancements:', error);
    process.exit(1);
  }
}

// 実行
addSecurityEnhancements();