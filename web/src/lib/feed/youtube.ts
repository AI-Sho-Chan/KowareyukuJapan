/**
 * YouTube API統合
 * 保守系チャンネルの動画を定期取得
 */

import { fetchUrlWithSsrfGuard } from '../ssrf.js';

interface YouTubeChannel {
  id: string;
  name: string;
  channelId: string;
  keywords: string[];
  maxPerHour: number;
}

// 監視対象の保守系YouTubeチャンネル
export const YOUTUBE_CHANNELS: YouTubeChannel[] = [
  {
    id: 'takahashi-yoichi',
    name: '高橋洋一チャンネル',
    channelId: 'UC6ag81wMs4pnJjLuSJDzuVA',
    keywords: ['経済', '積極財政', '財務省批判', '保守'],
    maxPerHour: 1
  },
  {
    id: 'yamaguchi-noriyuki',
    name: '山口敬之チャンネル',
    channelId: 'UCpAjmHTwvOQq1_wachYdnwg',
    keywords: ['保守', '政治', 'ジャーナリズム'],
    maxPerHour: 1
  },
  {
    id: 'toranomon-news',
    name: '真相深入り！虎ノ門ニュース',
    channelId: 'UCHk5mAXPuNWTXBaU0mSvhGg',
    keywords: ['保守', 'ニュース', '政治'],
    maxPerHour: 1
  }
];

// 検索キーワード
export const YOUTUBE_SEARCH_KEYWORDS = [
  '保守 日本',
  '反中国共産党',
  '積極財政',
  '財務省 批判',
  '外国人犯罪',
  '移民問題 日本',
  '媚中政治家',
  'ウイグル 人権',
  '憲法改正',
  '国防強化'
];

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  embedUrl: string;
}

/**
 * YouTube Data APIを使用して動画を取得
 * Note: 実際の実装にはAPI KEYが必要
 */
export async function fetchYouTubeVideos(
  apiKey: string,
  channelId?: string,
  searchQuery?: string,
  maxResults: number = 5
): Promise<YouTubeVideo[]> {
  const baseUrl = 'https://www.googleapis.com/youtube/v3/search';
  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    type: 'video',
    order: 'date',
    maxResults: maxResults.toString(),
    relevanceLanguage: 'ja',
    regionCode: 'JP'
  });
  
  if (channelId) {
    params.append('channelId', channelId);
  }
  
  if (searchQuery) {
    params.append('q', searchQuery);
  }
  
  try {
    const response = await fetchUrlWithSsrfGuard(`${baseUrl}?${params}`, {
      allowHttp: false,
      timeoutMs: 10000,
      maxSize: 1024 * 1024 // 1MB
    });
    
    const data = JSON.parse(response.content);
    
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`
    }));
  } catch (error) {
    console.error('YouTube API error:', error);
    return [];
  }
}

/**
 * YouTubeのRSSフィードから動画を取得（API KEY不要）
 */
export async function fetchYouTubeChannelRSS(channelId: string): Promise<YouTubeVideo[]> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  
  try {
    const response = await fetchUrlWithSsrfGuard(rssUrl, {
      allowHttp: false,
      timeoutMs: 10000,
      maxSize: 512 * 1024 // 512KB
    });
    
    // Simple XML parsing for YouTube RSS
    const videos: YouTubeVideo[] = [];
    const entryRegex = /<entry>(.*?)<\/entry>/gs;
    const entries = response.content.match(entryRegex) || [];
    
    for (const entry of entries.slice(0, 5)) {
      const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>(.*?)<\/title>/)?.[1];
      const channelName = entry.match(/<name>(.*?)<\/name>/)?.[1];
      const published = entry.match(/<published>(.*?)<\/published>/)?.[1];
      
      if (videoId && title) {
        videos.push({
          id: videoId,
          title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
          description: '',
          channelId: channelId,
          channelTitle: channelName || '',
          publishedAt: published || new Date().toISOString(),
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`
        });
      }
    }
    
    return videos;
  } catch (error) {
    console.error('YouTube RSS error:', error);
    return [];
  }
}

/**
 * 保守系チャンネルから最新動画を取得
 */
export async function fetchConservativeYouTubeVideos(): Promise<YouTubeVideo[]> {
  const allVideos: YouTubeVideo[] = [];
  
  for (const channel of YOUTUBE_CHANNELS) {
    try {
      const videos = await fetchYouTubeChannelRSS(channel.channelId);
      // 1時間に1本の制限を適用
      const recentVideos = videos.slice(0, channel.maxPerHour);
      allVideos.push(...recentVideos);
    } catch (error) {
      console.error(`Failed to fetch from ${channel.name}:`, error);
    }
  }
  
  // 公開日時でソート
  return allVideos.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}