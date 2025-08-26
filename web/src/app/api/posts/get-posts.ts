import { createClient } from '@libsql/client';

export async function getPosts(page: number = 1, limit: number = 20) {
  try {
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.execute('SELECT COUNT(*) as total FROM posts');
    const total = Number(countResult.rows[0].total);

    // Get posts with pagination
    const postsResult = await db.execute({
      sql: `SELECT id, owner_key, url, comment, tags, media_type, created_at, updated_at 
            FROM posts 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?`,
      args: [limit, offset]
    });

    const posts = postsResult.rows.map(row => ({
      id: row.id as string,
      owner_key: row.owner_key as string,
      url: row.url as string || undefined,
      comment: row.comment as string || undefined,
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      media_type: row.media_type as string || undefined,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
    }));

    return {
      ok: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error('Failed to fetch posts:', error);
    return {
      ok: false,
      error: 'Failed to fetch posts',
      message: error.message,
      posts: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }
}