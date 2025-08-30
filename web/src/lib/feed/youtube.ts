/**
 * YouTube API邨ｱ蜷・
 * 菫晏ｮ育ｳｻ繝√Ε繝ｳ繝阪Ν縺ｮ蜍慕判繧貞ｮ壽悄蜿門ｾ・
 */

import { fetchUrlWithSsrfGuard } from '@/lib/ssrf';

interface YouTubeChannel {
  id: string;
  name: string;
  channelId: string;
  keywords: string[];
  maxPerHour: number;
}

// 逶｣隕門ｯｾ雎｡縺ｮ菫晏ｮ育ｳｻYouTube繝√Ε繝ｳ繝阪Ν
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
    id: 'bunkajin-tv',
    name: '文化人放送局',
    channelId: 'UC7dXPammhcS6lrPzgq7WAPQ',
    keywords: ['政治', 'ニュース', '保守'],
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
];export const YOUTUBE_SEARCH_KEYWORDS = [
  '保守 日本',
  '反中国共産党',
  '積極財政',
  '財務省 批判',
  '外国人犯罪',
  '移民問題 日本',
  '媚中政治家',
  'ウイグル 人権',
  '憲法改正',
  '国防 強化'
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
 * YouTube Data API繧剃ｽｿ逕ｨ縺励※蜍慕判繧貞叙蠕・
 * Note: 螳滄圀縺ｮ螳溯｣・↓縺ｯAPI KEY縺悟ｿ・ｦ・
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
 * YouTube縺ｮRSS繝輔ぅ繝ｼ繝峨°繧牙虚逕ｻ繧貞叙蠕暦ｼ・PI KEY荳崎ｦ・ｼ・
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
 * 菫晏ｮ育ｳｻ繝√Ε繝ｳ繝阪Ν縺九ｉ譛譁ｰ蜍慕判繧貞叙蠕・
 */
export async function fetchConservativeYouTubeVideos(): Promise<YouTubeVideo[]> {
  const allVideos: YouTubeVideo[] = [];
  
  for (const channel of YOUTUBE_CHANNELS) {
    try {
      const videos = await fetchYouTubeChannelRSS(channel.channelId);
      // 1譎る俣縺ｫ1譛ｬ縺ｮ蛻ｶ髯舌ｒ驕ｩ逕ｨ
      const recentVideos = videos.slice(0, channel.maxPerHour);
      allVideos.push(...recentVideos);
    } catch (error) {
      console.error(`Failed to fetch from ${channel.name}:`, error);
    }
  }
  
  // 蜈ｬ髢区律譎ゅ〒繧ｽ繝ｼ繝・
  return allVideos.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}



