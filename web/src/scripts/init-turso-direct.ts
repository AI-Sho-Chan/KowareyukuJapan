import { createClient } from '@libsql/client';
import 'dotenv/config'; // Load .env file

async function initTursoDb() {
  const dbUrl = process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  console.log('--- Turso DB Initialization Script ---');
  console.log('Checking environment variables...');
  console.log(`TURSO_DB_URL: ${dbUrl ? dbUrl.substring(0, 20) + '...' : 'Not Set'}`);
  console.log(`TURSO_AUTH_TOKEN: ${authToken ? 'Set' : 'Not Set'}`);
  
  // トークンのデバッグ情報を追加
  if (authToken) {
    console.log(`Token length: ${authToken.length}`);
    console.log(`Token starts with: ${authToken.substring(0, 10)}...`);
    console.log(`Token contains non-ASCII: ${/[^\x00-\x7F]/.test(authToken)}`);
    
    // トークンが正しい形式かチェック
    if (!authToken.startsWith('eyJ')) {
      console.error('Warning: Token does not start with "eyJ" (typical JWT format)');
    }
  }

  if (!dbUrl || !authToken) {
    console.error('Error: TURSO_DB_URL or TURSO_AUTH_TOKEN is not set.');
    console.error('Please ensure these environment variables are configured.');
    process.exit(1);
  }

  try {
    console.log('Creating Turso client...');
    const db = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    console.log('Connected to Turso DB. Initializing schema...');

    // Create posts table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT,
        comment TEXT,
        handle TEXT,
        tags TEXT,
        metadata_json TEXT,
        owner_key TEXT,
        created_at INTEGER NOT NULL,
        isPublished INTEGER DEFAULT 1,
        reportCount INTEGER DEFAULT 0
      );
    `);
    console.log('Table "posts" ensured.');

    // Insert sample data if table is empty
    const { rows: countRows } = await db.execute('SELECT COUNT(*) as count FROM posts');
    const postCount = Number(countRows[0].count);

    if (postCount === 0) {
      console.log('Inserting sample data...');
      const samplePosts = [
        { id: '1', url: 'https://example.com/news1', comment: '日本の伝統文化の重要性について', tags: JSON.stringify(['ニュース', '日本']), owner_key: 'demo', created_at: Date.now() - 3600000 * 10 },
        { id: '2', url: 'https://example.com/news2', comment: '少子化社会の安全保障', tags: JSON.stringify(['安全保障', '政治']), owner_key: 'demo', created_at: Date.now() - 3600000 * 20 },
        { id: '3', url: 'https://example.com/video1', comment: '最新の経済動向についての解説動画', tags: JSON.stringify(['動画', '経済']), owner_key: 'demo', created_at: Date.now() - 3600000 * 30 },
      ];

      for (const post of samplePosts) {
        await db.execute({
          sql: `INSERT INTO posts (id, url, comment, tags, owner_key, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [post.id, post.url, post.comment, post.tags, post.owner_key, post.created_at],
        });
      }
      console.log(`Inserted ${samplePosts.length} sample posts.`);
    } else {
      console.log(`Posts table already contains ${postCount} entries. Skipping sample data insertion.`);
    }

    console.log('Turso DB initialization completed successfully.');
  } catch (error: any) {
    console.error('Error during Turso DB initialization:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    // Close connection if necessary, though @libsql/client handles pooling
  }
}

initTursoDb();