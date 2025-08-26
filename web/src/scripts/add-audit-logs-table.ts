import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addAuditLogsTable() {
  console.log('Creating audit_logs table...');
  
  try {
    // audit_logsテーブルの作成（既存テーブルを削除して再作成）
    try {
      await db.execute(`DROP TABLE IF EXISTS audit_logs`);
      console.log('✓ Dropped existing audit_logs table');
    } catch (e) {
      // エラーは無視
    }
    
    await db.execute(`
      CREATE TABLE audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        severity TEXT NOT NULL,
        user_id TEXT,
        ip_address TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created audit_logs table');
    
    // インデックスの作成
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)',
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
    
    // テーブルの統計情報
    const result = await db.execute(`SELECT COUNT(*) as count FROM audit_logs`);
    const count = result.rows[0]?.count || 0;
    console.log(`\n✅ audit_logs table ready with ${count} records`);
    
  } catch (error) {
    console.error('Error creating audit_logs table:', error);
    process.exit(1);
  }
}

// 実行
addAuditLogsTable();