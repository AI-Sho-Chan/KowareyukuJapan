'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useEventTracking } from '@/hooks/useEventTracking';

interface TrendingPost {
  rank: number;
  post: {
    id: string;
    url: string;
    title: string;
    summary: string;
    thumbnail?: string;
    type: string;
    tags: string[];
    published_at: number;
    source?: {
      id: string;
      name: string;
      category: string;
    };
  };
  stats: {
    score: number;
    views: number;
    empathies: number;
    shares: number;
  };
}

interface TrendingPostsProps {
  limit?: number;
  className?: string;
  showStats?: boolean;
}

export function TrendingPosts({ 
  limit = 10, 
  className = '',
  showStats = true
}: TrendingPostsProps) {
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { trackView, trackClick } = useEventTracking(null);
  
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trending?limit=${limit}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch trending posts');
        }
        
        const data = await response.json();
        setPosts(data.posts || []);
        
        // Track views for visible trending posts
        data.posts?.forEach((item: TrendingPost) => {
          trackView(item.post.id);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrending();
  }, [limit]);
  
  const handleClick = (postId: string) => {
    trackClick(postId, 'trending_list');
  };
  
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  const getTimeAgo = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    
    if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes}分前`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}時間前`;
    } else if (diff < 604800) {
      const days = Math.floor(diff / 86400);
      return `${days}日前`;
    } else {
      const date = new Date(timestamp * 1000);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };
  
  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };
  
  if (loading) {
    return (
      <div className={`trending-posts ${className}`}>
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`trending-posts ${className}`}>
        <div className="text-red-500 text-sm">
          トレンドの読み込みに失敗しました
        </div>
      </div>
    );
  }
  
  if (posts.length === 0) {
    return (
      <div className={`trending-posts ${className}`}>
        <div className="text-gray-500 text-sm">
          トレンド情報はまだありません
        </div>
      </div>
    );
  }
  
  return (
    <div className={`trending-posts ${className}`}>
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">🔥</span>
        トレンド
      </h2>
      
      <div className="space-y-4">
        {posts.map((item) => (
          <div 
            key={item.post.id}
            className="trending-item border-b pb-4 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <div className="rank-badge text-lg font-bold min-w-[30px]">
                {getRankIcon(item.rank)}
              </div>
              
              <div className="flex-1">
                <Link
                  href={item.post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleClick(item.post.id)}
                  className="block hover:underline"
                >
                  <h3 className="font-medium text-sm sm:text-base line-clamp-2 text-blue-600 hover:text-blue-800">
                    {item.post.title}
                  </h3>
                </Link>
                
                {item.post.summary && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                    {item.post.summary}
                  </p>
                )}
                
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {item.post.source && (
                    <span className="source-badge bg-gray-100 px-2 py-0.5 rounded">
                      {item.post.source.name}
                    </span>
                  )}
                  
                  <span className="time-ago">
                    {getTimeAgo(item.post.published_at)}
                  </span>
                  
                  {showStats && (
                    <>
                      <span className="stat-item" title="閲覧数">
                        👁 {formatNumber(item.stats.views)}
                      </span>
                      <span className="stat-item" title="共感">
                        ❤️ {formatNumber(item.stats.empathies)}
                      </span>
                      <span className="stat-item" title="シェア">
                        🔄 {formatNumber(item.stats.shares)}
                      </span>
                    </>
                  )}
                </div>
                
                {item.post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.post.tags.slice(0, 3).map(tag => (
                      <span 
                        key={tag}
                        className="tag text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {item.post.thumbnail && (
                <div className="thumbnail hidden sm:block">
                  <img 
                    src={item.post.thumbnail}
                    alt=""
                    className="w-20 h-20 object-cover rounded"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <Link
          href="/trending"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          すべてのトレンドを見る →
        </Link>
      </div>
    </div>
  );
}