import { StatsRepository } from '@/lib/db/stats-repository';
import { PostsRepository } from '@/lib/db/posts-repository';

export const dynamic = 'force-dynamic';

function parseWeek(param: string): { start: Date; end: Date } {
  const [y, w] = param.split('-').map(Number);
  // ISO week: approximate by taking first day of year and adding weeks
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const start = new Date(jan4);
  start.setUTCDate(jan4.getUTCDate() - day + 1 + (w - 1) * 7);
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 7);
  return { start, end };
}

export default async function WeeklyPage({ params }: { params: Promise<{ 'yyyy-ww': string }> }){
  try {
    const resolvedParams = await params;
    const stats = new StatsRepository();
    const postsRepo = new PostsRepository();
    // For now, reuse 7d trending as weekly summary
    const scores = await stats.computeTrendingScores(24 * 7);
    const ids = scores.slice(0, 50).map(s => s.post_id);
    const posts = (await Promise.all(
      ids.map(async (id) => {
        try {
          return await postsRepo.getPost(id);
        } catch {
          return null;
        }
      })
    )).filter(Boolean);
    
    return (
      <main className="container">
        <h1 className="title">週間まとめ（{resolvedParams['yyyy-ww']}）</h1>
        <section className="feed" id="feed">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              この週のデータはまだありません。
            </div>
          ) : (
            posts.map(p => p && (
              <article key={p.id} className="card" data-post-id={p.id}>
                <div className="card-body">
                  <h2 className="title">{p.title}</h2>
                  {p.media?.type === 'image' && <img src={p.media.url} alt={p.title} style={{ width:'100%', marginTop:8 }} />}
                  {p.media?.type === 'video' && <video controls playsInline preload="metadata" src={p.media.url} style={{ width:'100%', marginTop:8 }} />}
                  {p.url && !p.media && <p style={{marginTop:8}}><a href={p.url} target="_blank" rel="noopener noreferrer">引用元へ</a></p>}
                  {p.comment && <p style={{marginTop:12}}>{p.comment}</p>}
                </div>
              </article>
            ))
          )}
        </section>
      </main>
    );
  } catch (error) {
    console.error('Weekly page error:', error);
    const resolvedParams = await params;
    return (
      <main className="container">
        <h1 className="title">週間まとめ（{resolvedParams['yyyy-ww']}）</h1>
        <div className="text-center py-8 text-red-500">
          データの取得中にエラーが発生しました。
        </div>
      </main>
    );
  }
}


