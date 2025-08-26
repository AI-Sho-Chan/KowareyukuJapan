import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: トレンディング投稿を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const date = searchParams.get('date'); // 特定の日付のトレンド
    
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    // 日付を指定しない場合は最新の日付を使用
    let targetDate = date;
    if (!targetDate) {
      const latestDate = await db.execute(`
        SELECT date FROM trending_daily 
        ORDER BY date DESC 
        LIMIT 1
      `);
      
      if (latestDate.rows.length > 0) {
        targetDate = latestDate.rows[0].date as string;
      } else {
        // トレンドデータがない場合は空配列を返す
        return NextResponse.json({
          ok: true,
          date: null,
          posts: [],
          total: 0
        });
      }
    }
    
    // トレンディング投稿を取得
    const trending = await db.execute({
      sql: `
        SELECT 
          t.*,
          p.url,
          p.title,
          p.summary,
          p.thumbnail,
          p.type,
          p.tags_json,
          p.published_at,
          p.source_id,
          fs.name as source_name,
          fs.category as source_category
        FROM trending_daily t
        JOIN posts p ON t.post_id = p.id
        LEFT JOIN feed_sources fs ON p.source_id = fs.id
        WHERE t.date = ?
        ORDER BY t.rank ASC
        LIMIT ? OFFSET ?
      `,
      args: [targetDate, limit, offset]
    });
    
    // 総数を取得
    const totalResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM trending_daily WHERE date = ?`,
      args: [targetDate]
    });
    
    const total = Number(totalResult.rows[0]?.total || 0);
    
    // レスポンス用にデータを整形
    const posts = trending.rows.map(row => ({
      rank: row.rank,
      post: {
        id: row.post_id,
        url: row.url,
        title: row.title,
        summary: row.summary,
        thumbnail: row.thumbnail,
        type: row.type,
        tags: row.tags_json ? JSON.parse(row.tags_json as string) : [],
        published_at: row.published_at,
        source: row.source_name ? {
          id: row.source_id,
          name: row.source_name,
          category: row.source_category
        } : null
      },
      stats: {
        score: Math.round(Number(row.score)),
        views: Number(row.views),
        empathies: Number(row.empathies),
        shares: Number(row.shares)
      }
    }));
    
    return NextResponse.json({
      ok: true,
      date: targetDate,
      posts,
      total,
      hasMore: offset + limit < total
    });
    
  } catch (error: any) {
    console.error('Failed to fetch trending:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch trending posts' },
      { status: 500 }
    );
  }
}