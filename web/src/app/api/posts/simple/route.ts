import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // データベースから実際のデータを取得を試みる
    try {
      const db = createClient({
        url: process.env.TURSO_DATABASE_URL || process.env.TURSO_DB_URL || '',
        authToken: process.env.TURSO_AUTH_TOKEN || ''
      });

      const result = await db.execute({
        sql: 'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
        args: [limit, offset]
      });

      const countResult = await db.execute('SELECT COUNT(*) as total FROM posts');
      const total = Number(countResult.rows[0].total);

      return NextResponse.json({
        ok: true,
        posts: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (dbError) {
      console.error('Database error, falling back to demo data:', dbError);
    }

    // フォールバック：デモデータを返す
    const demoPosts = [
      {
        id: '1',
        url: 'https://example.com/news1',
        comment: '日本の伝統文化を守ることの重要性について',
        tags: ['ニュース', '日本'],
        owner_key: 'demo',
        created_at: Date.now() - 3600000,
      },
      {
        id: '2',
        url: 'https://example.com/news2',
        comment: '地域社会の安全を考える',
        tags: ['治安/マナー', '政治/制度'],
        owner_key: 'demo',
        created_at: Date.now() - 7200000,
      },
      {
        id: '3',
        url: 'https://example.com/video1',
        comment: '最新の政策についての解説動画',
        tags: ['動画', 'ニュース'],
        owner_key: 'demo',
        created_at: Date.now() - 10800000,
      },
    ];

    return NextResponse.json({
      ok: true,
      posts: demoPosts.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total: demoPosts.length,
        totalPages: Math.ceil(demoPosts.length / limit),
      },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: 'データの取得に失敗しました',
        message: error.message 
      },
      { status: 500 }
    );
  }
}