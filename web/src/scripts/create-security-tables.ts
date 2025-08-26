import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function createSecurityTables() {
  console.log('Creating security tables...');
  
  try {
    // Create blocked_users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_key TEXT NOT NULL UNIQUE,
        reason TEXT NOT NULL,
        blocked_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created blocked_users table');
    
    // Create blocked_ips table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL UNIQUE,
        reason TEXT NOT NULL,
        blocked_until DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created blocked_ips table');
    
    // Create rate_limit_logs table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rate_limit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        action TEXT NOT NULL,
        allowed BOOLEAN NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created rate_limit_logs table');
    
    // Create indexes
    await db.execute('CREATE INDEX IF NOT EXISTS idx_blocked_users_owner_key ON blocked_users(owner_key)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_identifier ON rate_limit_logs(identifier)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created_at ON rate_limit_logs(created_at)');
    console.log('✓ Created indexes');
    
    // Verify tables exist
    const tables = await db.execute(`
      SELECT name FROM sqlite_master WHERE type='table' 
      AND name IN ('blocked_users', 'blocked_ips', 'rate_limit_logs')
    `);
    
    console.log('\n✓ Security tables created successfully:');
    tables.rows.forEach(row => console.log(`  - ${(row as any).name}`));
    
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

createSecurityTables();