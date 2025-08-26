import { MetadataRoute } from 'next';
import { PostsRepository } from '@/lib/db/posts-repository';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';
  const repo = new PostsRepository();
  const posts = await repo.getAllPosts({ limit: 1000 });
  const items: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${base}/post/${p.id}`,
    lastModified: new Date(p.createdAt),
    changeFrequency: 'daily',
    priority: 0.6,
  }));
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/trending`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
    ...items,
  ];
}


