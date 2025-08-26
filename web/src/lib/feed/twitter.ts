/**
 * X (Twitter) API統合
 * 保守系アカウントと話題のツイートを取得
 */

interface TwitterAccount {
  id: string;
  name: string;
  username: string;
  keywords: string[];
  maxPerHour: number;
}

// 監視対象の保守系Xアカウント
export const TWITTER_ACCOUNTS: TwitterAccount[] = [
  {
    id: 'kadotayoshikazu',
    name: '門田隆将',
    username: 'KadotaRyusho',
    keywords: ['保守', 'ジャーナリスト'],
    maxPerHour: 2
  },
  {
    id: 'takada_nobuhiko',
    name: '高田延彦',
    username: 'takada_nobuhiko',
    keywords: ['保守', '社会問題'],
    maxPerHour: 1
  },
  {
    id: 'hyakutanaoki',
    name: '百田尚樹',
    username: 'hyakutanaoki',
    keywords: ['保守', '作家'],
    maxPerHour: 2
  },
  {
    id: 'arimoto_kaori',
    name: '有本香',
    username: 'arimoto_kaori',
    keywords: ['保守', 'ジャーナリスト'],
    maxPerHour: 1
  },
  {
    id: 'tsukurukai_pr',
    name: '新しい歴史教科書をつくる会',
    username: 'Tsukurukai',
    keywords: ['保守', '教育'],
    maxPerHour: 1
  }
];

// 検索キーワード（トレンド監視用）
export const TWITTER_SEARCH_KEYWORDS = [
  '外国人犯罪',
  'クルド人 日本',
  '不法滞在',
  '中国 脅威',
  '媚中政治家',
  '財務省 緊縮',
  '積極財政',
  '移民反対',
  '日本を守る',
  '保守'
];

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  mediaUrls?: string[];
  embedUrl: string;
}

/**
 * X APIを使用してツイートを取得
 * Note: 実際の実装にはAPI認証が必要
 */
export async function fetchTweets(
  bearerToken: string,
  userId?: string,
  searchQuery?: string,
  maxResults: number = 10
): Promise<Tweet[]> {
  // X API v2 エンドポイント
  let endpoint = '';
  const params = new URLSearchParams({
    'max_results': maxResults.toString(),
    'tweet.fields': 'created_at,public_metrics,author_id',
    'user.fields': 'name,username',
    'media.fields': 'url,preview_image_url',
    'expansions': 'author_id,attachments.media_keys'
  });
  
  if (userId) {
    endpoint = `https://api.twitter.com/2/users/${userId}/tweets`;
  } else if (searchQuery) {
    endpoint = 'https://api.twitter.com/2/tweets/search/recent';
    params.append('query', `${searchQuery} lang:ja -is:retweet`);
  } else {
    return [];
  }
  
  try {
    // Note: 実際のAPI呼び出しには認証が必要
    // ここではモック実装
    console.log('X API call would be made to:', endpoint);
    return [];
  } catch (error) {
    console.error('X API error:', error);
    return [];
  }
}

/**
 * nitterなどの代替インスタンスからツイートを取得
 * （API制限回避用のフォールバック）
 */
export async function fetchTweetsFromNitter(username: string): Promise<Tweet[]> {
  // Nitterインスタンス（複数用意してフォールバック）
  const nitterInstances = [
    'nitter.net',
    'nitter.it',
    'nitter.unixfox.eu'
  ];
  
  // Note: Nitterのスクレイピングは技術的に可能だが、
  // 利用規約とインスタンスの負荷を考慮する必要がある
  console.log('Would fetch from Nitter for:', username);
  return [];
}

/**
 * 話題の保守系ツイートを取得
 */
export async function fetchConservativeTweets(): Promise<Tweet[]> {
  const allTweets: Tweet[] = [];
  
  // キーワード検索で話題のツイートを取得
  for (const keyword of TWITTER_SEARCH_KEYWORDS.slice(0, 3)) {
    // API制限を考慮して最初の3キーワードのみ
    try {
      // 実際のAPI呼び出しまたは代替手段
      const tweets = await fetchTweets('', undefined, keyword, 5);
      allTweets.push(...tweets);
    } catch (error) {
      console.error(`Failed to search for ${keyword}:`, error);
    }
  }
  
  // 重複を除去して返す
  const uniqueTweets = allTweets.filter((tweet, index, self) =>
    index === self.findIndex((t) => t.id === tweet.id)
  );
  
  return uniqueTweets.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * ツイートの埋め込みHTML生成
 */
export function generateTweetEmbed(tweetUrl: string): string {
  return `<blockquote class="twitter-tweet" data-lang="ja">
    <a href="${tweetUrl}"></a>
  </blockquote>
  <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;
}