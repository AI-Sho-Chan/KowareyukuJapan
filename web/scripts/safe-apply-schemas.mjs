import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function applySafely(sqlFile) {
  const p = path.join(process.cwd(), 'src', 'lib', 'db', sqlFile);
  if (!fs.existsSync(p)) {
    console.log(`⚠️ File not found: ${sqlFile}`);
    return;
  }
  
  const raw = fs.readFileSync(p, 'utf8');
  
  // Split by semicolon but be careful with statements
  const stmts = raw
    .split(/;\s*$/gm)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  console.log(`\n📄 Applying ${sqlFile} (${stmts.length} statements)...`);
  
  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i].trim();
    if (!stmt) continue;
    
    // Skip if it's just a comment
    if (stmt.startsWith('--')) continue;
    
    try {
      // Check if it's a CREATE TABLE IF NOT EXISTS statement
      if (stmt.includes('CREATE TABLE IF NOT EXISTS')) {
        const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        const tableName = tableMatch ? tableMatch[1] : 'unknown';
        
        // Execute the statement
        await db.execute(stmt + ';');
        console.log(`  ✅ Table ${tableName} checked/created`);
      } else if (stmt.includes('CREATE INDEX IF NOT EXISTS')) {
        const indexMatch = stmt.match(/CREATE INDEX IF NOT EXISTS (\w+)/i);
        const indexName = indexMatch ? indexMatch[1] : 'unknown';
        
        await db.execute(stmt + ';');
        console.log(`  ✅ Index ${indexName} checked/created`);
      } else {
        // For other statements, just try to execute
        await db.execute(stmt + ';');
        console.log(`  ✅ Statement executed`);
      }
    } catch (err) {
      // Log error but continue with other statements
      console.log(`  ⚠️ Skipped (${err.message})`);
    }
  }
}

(async () => {
  console.log('🔧 Safely applying database schemas...\n');
  
  try {
    // Apply schemas in order
    await applySafely('schema.sql');
    await applySafely('security-schema.sql');
    
    console.log('\n✅ Schema application completed');
    
    // Verify critical tables
    console.log('\n📊 Verifying critical tables...');
    const criticalTables = ['posts', 'feed_sources', 'feed_items', 'events', 'comments'];
    
    for (const table of criticalTables) {
      const result = await db.execute({
        sql: `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name = ?`,
        args: [table]
      });
      
      const exists = result.rows[0].count > 0;
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
    
  } catch (err) {
    console.error('\n❌ Fatal error:', err?.message || err);
    process.exitCode = 1;
  }
})();