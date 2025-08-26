import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET() {
  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    // Try to query the database
    await db.execute('SELECT 1');
    
    return NextResponse.json({ 
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ 
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}