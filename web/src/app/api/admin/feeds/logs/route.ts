import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: フィードログ取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('source_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    let sql = `
      SELECT fl.*, fs.name as source_name 
      FROM feed_logs fl
      LEFT JOIN feed_sources fs ON fl.source_id = fs.id
    `;
    
    const args: any[] = [];
    
    if (sourceId) {
      sql += ' WHERE fl.source_id = ?';
      args.push(sourceId);
    }
    
    sql += ' ORDER BY fl.created_at DESC LIMIT ?';
    args.push(limit);

    const logs = await db.execute({ sql, args });

    return NextResponse.json({
      ok: true,
      logs: logs.rows,
    });
  } catch (error: any) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}