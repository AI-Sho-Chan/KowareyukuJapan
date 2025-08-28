import { createClient } from '@libsql/client';
import 'dotenv/config';

async function fixDatabaseSchema() {
  const dbUrl = process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  console.log('--- Fix Database Schema Script ---');
  console.log('Checking environment variables...');
  console.log(`TURSO_DB_URL: ${dbUrl ? dbUrl.substring(0, 20) + '...' : 'Not Set'}`);
  console.log(`TURSO_AUTH_TOKEN: ${authToken ? 'Set' : 'Not Set'}`);

  if (!dbUrl || !authToken) {
    console.error('Error: TURSO_DB_URL or TURSO_AUTH_TOKEN is not set.');
    process.exit(1);
  }

  try {
    const db = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    console.log('Connected to Turso DB. Fixing schema...');

    // 1. Add updated_at column if it doesn't exist
    try {
      await db.execute('ALTER TABLE posts ADD COLUMN updated_at INTEGER');
      console.log('Added updated_at column');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('updated_at column already exists');
      } else {
        throw error;
      }
    }

    // 2. Rename isPublished to is_published
    try {
      await db.execute('ALTER TABLE posts RENAME COLUMN isPublished TO is_published');
      console.log('Renamed isPublished to is_published');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('is_published column already exists');
      } else if (error.message.includes('no such column')) {
        console.log('isPublished column does not exist, checking for is_published');
        const { rows } = await db.execute("PRAGMA table_info(posts)");
        const hasIsPublished = rows.some((row: any) => row.name === 'is_published');
        if (!hasIsPublished) {
          await db.execute('ALTER TABLE posts ADD COLUMN is_published INTEGER DEFAULT 1');
          console.log('Added is_published column');
        }
      } else {
        throw error;
      }
    }

    // 3. Rename reportCount to report_count
    try {
      await db.execute('ALTER TABLE posts RENAME COLUMN reportCount TO report_count');
      console.log('Renamed reportCount to report_count');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('report_count column already exists');
      } else if (error.message.includes('no such column')) {
        console.log('reportCount column does not exist, checking for report_count');
        const { rows } = await db.execute("PRAGMA table_info(posts)");
        const hasReportCount = rows.some((row: any) => row.name === 'report_count');
        if (!hasReportCount) {
          await db.execute('ALTER TABLE posts ADD COLUMN report_count INTEGER DEFAULT 0');
          console.log('Added report_count column');
        }
      } else {
        throw error;
      }
    }

    // 4. Update existing records to set updated_at
    await db.execute('UPDATE posts SET updated_at = created_at WHERE updated_at IS NULL');
    console.log('Updated existing records with updated_at');

    // 5. Verify the schema
    const { rows: structure } = await db.execute("PRAGMA table_info(posts)");
    console.log('Final posts table structure:');
    structure.forEach((row: any) => {
      console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
    });

    console.log('Database schema fix completed successfully.');
  } catch (error: any) {
    console.error('Error during schema fix:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

fixDatabaseSchema();
