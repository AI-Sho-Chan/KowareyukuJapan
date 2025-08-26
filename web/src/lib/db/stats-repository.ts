import { db } from './index';

export class StatsRepository {
  async addEvent(postId: string, type: 'view'|'empathy'|'share', userFp?: string, ipHash?: string): Promise<void> {
    await db.execute({
      sql: `INSERT INTO events (post_id, type, user_fp, ip_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
      args: [postId, type, userFp || null, ipHash || null, Math.floor(Date.now() / 1000)],
    });
    const col = type === 'view' ? 'views' : type === 'empathy' ? 'empathies' : 'shares';
    await db.execute({
      sql: `INSERT INTO post_stats (post_id, ${col}, last_event_at) VALUES (?, 1, ?)
            ON CONFLICT(post_id) DO UPDATE SET ${col} = ${col} + 1, last_event_at = excluded.last_event_at`,
      args: [postId, new Date().toISOString()],
    });
  }

  async recentEventsCount(postId: string, type: 'view'|'empathy'|'share', userFp: string, windowMinutes = 5): Promise<number> {
    const r = await db.execute({
      sql: `SELECT COUNT(1) AS c FROM events WHERE post_id=? AND type=? AND user_fp=? AND created_at >= unixepoch('now', ?)`,
      args: [postId, type, userFp, `-${windowMinutes} minutes`],
    });
    const row: any = r.rows[0] || { c: 0 };
    return Number(row.c || 0);
  }

  async computeTrendingScores(hours = 24): Promise<Array<{ post_id: string; score: number }>> {
    // Exponential decay by hours (half-life ~36h)
    const halfLife = 36;
    const r = await db.execute({
      sql: `
        WITH recent AS (
          SELECT post_id, type, unixepoch('now') - created_at AS age_sec
          FROM events WHERE created_at >= unixepoch('now', ?) -- window
        ),
        weighted AS (
          SELECT post_id,
                 CASE type WHEN 'empathy' THEN 5 WHEN 'share' THEN 3 ELSE 1 END AS w,
                 age_sec
          FROM recent
        )
        SELECT post_id,
               SUM(w * EXP(- (age_sec/3600.0) * LN(2) / ?)) AS score
        FROM weighted GROUP BY post_id ORDER BY score DESC LIMIT 100
      `,
      args: [`-${hours} hours`, halfLife],
    });
    return (r.rows as any[]).map(row => ({ post_id: row.post_id as string, score: Number(row.score) }));
  }

  async saveTrendingDaily(date: string, items: Array<{ post_id: string; score: number }>): Promise<void> {
    let rank = 1;
    for (const it of items) {
      await db.execute({
        sql: `INSERT INTO trending_daily (date, post_id, score, rank)
              VALUES (?, ?, ?, ?) ON CONFLICT(date, post_id) DO UPDATE SET score=excluded.score, rank=excluded.rank`,
        args: [date, it.post_id, it.score, rank++],
      });
    }
  }
}


