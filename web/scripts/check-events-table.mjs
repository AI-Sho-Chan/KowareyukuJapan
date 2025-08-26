import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  console.log('Checking events table structure...\n');
  
  try {
    const eventsInfo = await db.execute(`PRAGMA table_info(events)`);
    
    console.log('Events table columns:');
    for (const col of eventsInfo.rows) {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    }
    
    // Check if 'at' column exists
    const hasAtColumn = eventsInfo.rows.some(col => col.name === 'at');
    const hasCreatedAtColumn = eventsInfo.rows.some(col => col.name === 'created_at');
    
    console.log(`\n'at' column exists: ${hasAtColumn ? '✅' : '❌'}`);
    console.log(`'created_at' column exists: ${hasCreatedAtColumn ? '✅' : '❌'}`);
    
    if (!hasAtColumn && hasCreatedAtColumn) {
      console.log('\n⚠️ The events table uses "created_at" instead of "at"');
      console.log('The schema.sql file needs to be updated to match the actual table structure.');
    }
    
  } catch (err) {
    console.error('Error checking events table:', err?.message || err);
    process.exitCode = 1;
  }
})();