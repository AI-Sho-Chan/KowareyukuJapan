import { NextRequest, NextResponse } from 'next/server';
import { StatsRepository } from '@/lib/db/stats-repository';
import { PostsRepository } from '@/lib/db/posts-repository';

export async function GET(_: NextRequest) {
  const stats = new StatsRepository();
  const postsRepo = new PostsRepository();
  const top = await stats.computeTrendingScores(24 * 7);
  const ids = top.slice(0, 10).map(t => t.post_id);
  const posts = (await Promise.all(ids.map(id => postsRepo.getPost(id)))).filter(Boolean) as any[];
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>週間ダイジェスト</title></head><body>${
    posts.map(p => `
      <article>
        <h2><a href="${base}/post/${p.id}">${escapeHtml(p.title)}</a></h2>
        ${p.media?.type==='image' ? `<img src="${p.media.url}" alt="${escapeHtml(p.title)}" style="max-width:100%"/>` : ''}
        ${p.comment ? `<p>${escapeHtml(p.comment)}</p>` : ''}
      </article>
    `).join('\n')
  }</body></html>`;
  return NextResponse.json({ ok:true, html });
}

function escapeHtml(s: string){
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c] as string));
}


