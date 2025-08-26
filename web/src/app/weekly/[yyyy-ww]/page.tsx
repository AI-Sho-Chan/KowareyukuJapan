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

export default async function WeeklyPage({ params }: { params: { 'yyyy-ww': string } }){
  const stats = new StatsRepository();
  const postsRepo = new PostsRepository();
  // For now, reuse 7d trending as weekly summary
  const scores = await stats.computeTrendingScores(24 * 7);
  const ids = scores.slice(0, 50).map(s => s.post_id);
  const posts = await Promise.all(ids.map(id => postsRepo.getPost(id)));
  return (
    <main className="container">
      <h1 className="title">週間まとめ（{params['yyyy-ww']}）</h1>
      <section className="feed" id="feed">
        {posts.map(p => p && (
          <article key={p.id} className="card" data-post-id={p.id}>
            <div className="card-body">
              <h2 className="title">{p.title}</h2>
              {p.media?.type === 'image' && <img src={p.media.url} alt={p.title} style={{ width:'100%', marginTop:8 }} />}
              {p.media?.type === 'video' && <video controls playsInline preload="metadata" src={p.media.url} style={{ width:'100%', marginTop:8 }} />}
              {p.url && !p.media && <p style={{marginTop:8}}><a href={p.url} target="_blank" rel="noopener noreferrer">引用元へ</a></p>}
              {p.comment && <p style={{marginTop:12}}>{p.comment}</p>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}


