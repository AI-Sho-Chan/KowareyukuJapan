import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const dbUrl = process.env.TURSO_DB_URL || process.env.TURSO_DATABASE_URL || '';
    const authToken = process.env.TURSO_AUTH_TOKEN || '';
    const adminKey = process.env.ADMIN_SECRET_KEY || '';
    
    return NextResponse.json({
      ok: true,
      debug: {
        dbUrl: dbUrl ? dbUrl.substring(0, 30) + '...' : 'NOT_SET',
        hasAuthToken: !!authToken,
        hasAdminKey: !!adminKey,
        env: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      debug: {
        dbUrl: process.env.TURSO_DB_URL ? 'SET' : 'NOT_SET',
        hasAuthToken: !!process.env.TURSO_AUTH_TOKEN,
        hasAdminKey: !!process.env.ADMIN_SECRET_KEY
      }
    }, { status: 500 });
  }
}