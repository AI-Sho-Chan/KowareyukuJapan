import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET(req: NextRequest) {
  try {
    console.log('=== TEST DB API START ===');
    
    const dbUrl = process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL || '';
    const authToken = process.env.TURSO_AUTH_TOKEN || '';
    
    console.log('DB URL:', dbUrl);
    console.log('Auth Token exists:', !!authToken);
    
    if (!dbUrl || !authToken) {
      return NextResponse.json({
        ok: false,
        error: 'Database credentials not configured',
        dbUrl: dbUrl ? 'Set' : 'Not Set',
        authToken: authToken ? 'Set' : 'Not Set'
      }, { status: 500 });
    }
    
    const db = createClient({
      url: dbUrl,
      authToken: authToken
    });
    
    console.log('Database client created');
    
    // Test basic connection
    const { rows: testRows } = await db.execute('SELECT 1 as test');
    console.log('Basic query result:', testRows);
    
    // Check tables
    const { rows: tableRows } = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    console.log('Tables found:', tableRows);
    
    // Check posts table structure
    const { rows: postsStructure } = await db.execute(`
      PRAGMA table_info(posts)
    `);
    console.log('Posts table structure:', postsStructure);
    
    // Check posts count
    const { rows: postsCount } = await db.execute('SELECT COUNT(*) as count FROM posts');
    console.log('Posts count:', postsCount);
    
    // Check tags table
    const { rows: tagsCount } = await db.execute('SELECT COUNT(*) as count FROM tags');
    console.log('Tags count:', tagsCount);
    
    console.log('=== TEST DB API END ===');
    
    return NextResponse.json({
      ok: true,
      message: 'Database connection successful',
      tables: tableRows.map((row: any) => row.name),
      postsCount: Number(postsCount[0].count),
      tagsCount: Number(tagsCount[0].count),
      postsStructure: postsStructure.map((row: any) => ({
        name: row.name,
        type: row.type,
        notnull: row.notnull,
        dflt_value: row.dflt_value,
        pk: row.pk
      }))
    });
    
  } catch (error: any) {
    console.error('=== TEST DB API ERROR ===');
    console.error('Error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    console.error('=== TEST DB API ERROR END ===');
    
    return NextResponse.json({
      ok: false,
      error: 'Database test failed',
      message: error.message,
      name: error.name
    }, { status: 500 });
  }
}
