import { Metadata } from 'next';
import { PostsRepository } from '@/lib/db/posts-repository';
import { buildArticleLd, buildVideoLd, buildSocialPostingLd, clampText } from '@/lib/seo/schema';
import CommentsBox from '@/components/CommentsBox';

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const repo = new PostsRepository();
  const post = await repo.getPost(id);
  if (!post) return { title: 'Not Found' };
  const title = post.title || '(無題)';
  const description = clampText(post.comment || post.title || '', 160);
  const ogImages = post.media?.url ? [{ url: post.media.url }] : undefined;
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/post/${post.id}`;
  return {
    title,
    description: description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: description || undefined,
      url,
      images: ogImages,
      type: post.media?.type === 'video' ? 'video.other' : 'article',
    },
    twitter: {
      card: post.media ? 'summary_large_image' : 'summary',
      title,
      description: description || undefined,
      images: ogImages?.map(v => v.url),
    },
  };
}

export default async function PostDetail({ params }: { params: Promise<Params> }){
  const { id } = await params;
  const repo = new PostsRepository();
  const post = await repo.getPost(id);
  if (!post) return <main className="container"><h1>Not Found</h1></main>;
  const canonical = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com'}/post/${post.id}`;
  const ld = post.media?.type === 'video'
    ? buildVideoLd({ title: post.title, url: post.media.url, thumbnailUrl: post.media.url })
    : (post.url
        ? buildArticleLd({ id: post.id, title: post.title, url: canonical, description: post.comment, image: post.media?.url || null, datePublished: post.createdAt })
        : buildSocialPostingLd({ title: post.title, url: canonical, author: post.handle, datePublished: post.createdAt })
      );

  return (
    <main className="container">
      <link rel="canonical" href={canonical} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <article className="card" data-post-id={post.id}>
        <div className="card-body">
          <h1 className="title">{post.title}</h1>
          {post.media?.type === 'video' ? (
            <video controls playsInline preload="metadata" src={post.media.url} style={{ width: '100%', marginTop: 8 }} />
          ) : post.media?.type === 'image' ? (
            <img src={post.media.url} alt={post.title} style={{ width: '100%', marginTop: 8 }} />
          ) : post.url ? (
            <p style={{marginTop:8}}><a href={post.url} target="_blank" rel="noopener noreferrer">引用元へ</a></p>
          ) : null}
          {post.comment && <p style={{marginTop:12}}>{post.comment}</p>}
        </div>
      </article>
      {/* コメント */}
      <CommentsBox postId={post.id} ownerKey={(post as any).ownerKey} />
    </main>
  );
}


