import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://kowareyuku-japan.vercel.app';
  
  return [
    { 
      url: `${base}/`, 
      lastModified: new Date(), 
      changeFrequency: 'daily', 
      priority: 1.0 
    },
    { 
      url: `${base}/trending`, 
      lastModified: new Date(), 
      changeFrequency: 'hourly', 
      priority: 0.8 
    },
    { 
      url: `${base}/privacy`, 
      lastModified: new Date(), 
      changeFrequency: 'monthly', 
      priority: 0.3 
    },
    { 
      url: `${base}/terms`, 
      lastModified: new Date(), 
      changeFrequency: 'monthly', 
      priority: 0.3 
    },
  ];
}