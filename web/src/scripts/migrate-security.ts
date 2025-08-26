import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// データベース接続
const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function runMigration() {
  console.log('Starting security migration...');
  
  try {
    // セキュリティテーブルのスキーマを読み込み
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'security-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // SQL文を分割して実行
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // まずCREATE TABLEを実行、次にCREATE INDEXを実行
    const tables = statements.filter(s => s.match(/CREATE\s+TABLE/i));
    const indexes = statements.filter(s => s.match(/CREATE\s+INDEX/i));
    
    // テーブルを作成
    for (const statement of tables) {
      try {
        console.log(`Creating table: ${statement.substring(0, 50)}...`);
        await db.execute(statement + ';');
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          console.error('Error creating table:', error.message);
        } else {
          console.log('Table already exists, skipping...');
        }
      }
    }
    
    // インデックスを作成
    for (const statement of indexes) {
      try {
        console.log(`Creating index: ${statement.substring(0, 50)}...`);
        await db.execute(statement + ';');
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          console.error('Error creating index:', error.message);
        } else {
          console.log('Index already exists, skipping...');
        }
      }
    }
    
    // postsテーブルに is_deleted カラムを追加（存在しない場合）
    try {
      await db.execute('ALTER TABLE posts ADD COLUMN is_deleted BOOLEAN DEFAULT 0');
      console.log('Added is_deleted column to posts table');
    } catch (error: any) {
      if (error.message?.includes('duplicate column')) {
        console.log('is_deleted column already exists');
      } else {
        console.log('Could not add is_deleted column:', error.message);
      }
    }
    
    console.log('\n=== Security Migration Complete ===');
    console.log('Security features are now ready to use.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// 実行
runMigration();