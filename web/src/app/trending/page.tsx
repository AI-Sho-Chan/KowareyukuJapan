import { StatsRepository } from '@/lib/db/stats-repository';
import { PostsRepository } from '@/lib/db/posts-repository';

export const dynamic = 'force-dynamic';

export default async function TrendingPage(){
  const stats = new StatsRepository();
  const postsRepo = new PostsRepository();
  const scores = await stats.computeTrendingScores(24);
  const ids = scores.map(s => s.post_id);
  const posts = await Promise.all(ids.map(id => postsRepo.getPost(id)));
  return (
    <main className="container">
      <h1 className="title">今の注目</h1>
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


