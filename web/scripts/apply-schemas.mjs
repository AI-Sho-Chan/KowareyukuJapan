import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

async function apply(sqlFile) {
  const p = path.join(process.cwd(), 'src', 'lib', 'db', sqlFile);
  const raw = fs.readFileSync(p, 'utf8');
  const stmts = raw.split(';').map(s => s.trim()).filter(Boolean);
  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    try {
      await db.execute(stmt + ';');
    } catch (err) {
      // Skip CREATE TABLE/INDEX IF NOT EXISTS errors
      if (err.message.includes('already exists')) {
        continue;
      }
      // Skip comment lines
      if (stmt.trim().startsWith('--')) {
        continue;
      }
      console.error(`Error in statement ${i + 1} from ${sqlFile}:`);
      console.error(`Statement: ${stmt.substring(0, 100)}...`);
      throw err;
    }
  }
}

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

(async () => {
  await apply('schema.sql');
  await apply('security-schema.sql');
  console.log('Schemas applied successfully');
})().catch(err => {
  console.error('Schema apply failed:', err?.message || err);
  process.exitCode = 1;
});


