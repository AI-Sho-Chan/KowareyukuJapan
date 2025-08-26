import crypto from 'crypto';

export class Normalizer {
  /**
   * URL正規化（重複検出用）
   */
  static normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      
      // HTTPSに統一
      if (u.protocol === 'http:') {
        u.protocol = 'https:';
      }
      
      // WWWを除去
      u.hostname = u.hostname.replace(/^www\./, '');
      
      // モバイルURLをPC版に変換
      u.hostname = u.hostname.replace(/^m\./, '');
      u.hostname = u.hostname.replace(/^mobile\./, '');
      u.hostname = u.hostname.replace(/^sp\./, '');
      
      // 末尾スラッシュ除去（パス以外）
      if (u.pathname !== '/') {
        u.pathname = u.pathname.replace(/\/$/, '');
      }
      
      // UTMパラメータ等の除去
      const removeParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'dclid', 'msclkid',
        'ref', 'referrer', 'source',
        '__twitter_impression',
      ];
      
      for (const param of removeParams) {
        u.searchParams.delete(param);
      }
      
      // フラグメント除去
      u.hash = '';
      
      // ソート済みクエリパラメータ
      const sortedParams = new URLSearchParams(Array.from(u.searchParams.entries()).sort());
      u.search = sortedParams.toString();
      
      return u.toString();
    } catch {
      return url; // パース失敗時は元のURL
    }
  }

  /**
   * URLハッシュ生成（DB保存用）
   */
  static hashUrl(url: string): string {
    const normalized = this.normalizeUrl(url);
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * タイトル正規化（類似検出用）
   */
  static normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[\s\u3000]+/g, ' ') // 空白正規化
      .replace(/[【】「」『』（）()《》〈〉［］\[\]]/g, '') // 括弧除去
      .replace(/[！!？?。、,.・]/g, '') // 句読点除去
      .replace(/\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}[日]?/g, '') // 日付除去
      .replace(/\d{1,2}[時:]\d{1,2}[分]?/g, '') // 時刻除去
      .trim();
  }

  /**
   * タイトルハッシュ生成
   */
  static hashTitle(title: string): string {
    const normalized = this.normalizeTitle(title);
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * コンテンツ正規化（表示用）
   */
  static normalizeContent(content?: string): string {
    if (!content) return '';
    
    return content
      // HTMLタグ除去
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      // HTMLエンティティ変換
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // 空白正規化
      .replace(/[\s\u3000]+/g, ' ')
      .trim();
  }

  /**
   * サマリー生成
   */
  static generateSummary(content: string, maxLength: number = 200): string {
    const normalized = this.normalizeContent(content);
    if (normalized.length <= maxLength) {
      return normalized;
    }
    
    // 文境界で切る
    const truncated = normalized.substring(0, maxLength);
    const lastPeriod = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('？')
    );
    
    if (lastPeriod > maxLength * 0.5) {
      return truncated.substring(0, lastPeriod + 1);
    }
    
    return truncated + '...';
  }

  /**
   * ドメインからカテゴリ推定
   */
  static inferCategory(url: string): string | undefined {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      // ニュースサイト
      if (hostname.includes('news') || hostname.includes('nhk.or.jp') || 
          hostname.includes('sankei.com') || hostname.includes('asahi.com') ||
          hostname.includes('yomiuri.co.jp') || hostname.includes('mainichi.jp')) {
        return 'news';
      }
      
      // 政治
      if (hostname.includes('kantei.go.jp') || hostname.includes('mofa.go.jp') ||
          hostname.includes('moj.go.jp') || hostname.includes('diet.go.jp')) {
        return 'politics';
      }
      
      // 経済
      if (hostname.includes('nikkei.com') || hostname.includes('reuters.com') ||
          hostname.includes('bloomberg.co.jp')) {
        return 'economy';
      }
      
      // テクノロジー
      if (hostname.includes('itmedia.co.jp') || hostname.includes('techcrunch.com') ||
          hostname.includes('gigazine.net')) {
        return 'tech';
      }
      
      // YouTube
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return 'video';
      }
      
      // SNS
      if (hostname.includes('twitter.com') || hostname.includes('x.com') ||
          hostname.includes('instagram.com') || hostname.includes('tiktok.com')) {
        return 'social';
      }
      
      return 'general';
    } catch {
      return undefined;
    }
  }

  /**
   * キーワードからタグ生成
   */
  static generateTags(title: string, content?: string): string[] {
    const text = (title + ' ' + (content || '')).toLowerCase();
    const tags: string[] = [];
    
    // 政治関連
    if (text.includes('首相') || text.includes('内閣') || text.includes('国会')) {
      tags.push('政治');
    }
    if (text.includes('選挙') || text.includes('投票')) {
      tags.push('選挙');
    }
    
    // 国際関連
    if (text.includes('アメリカ') || text.includes('米国') || text.includes('usa')) {
      tags.push('アメリカ');
    }
    if (text.includes('中国') || text.includes('china')) {
      tags.push('中国');
    }
    if (text.includes('韓国') || text.includes('korea')) {
      tags.push('韓国');
    }
    
    // 経済関連
    if (text.includes('経済') || text.includes('景気') || text.includes('gdp')) {
      tags.push('経済');
    }
    if (text.includes('株') || text.includes('円') || text.includes('為替')) {
      tags.push('金融');
    }
    
    // 社会問題
    if (text.includes('少子化') || text.includes('高齢化')) {
      tags.push('少子高齢化');
    }
    if (text.includes('教育') || text.includes('学校')) {
      tags.push('教育');
    }
    
    // 安全保障
    if (text.includes('防衛') || text.includes('自衛隊') || text.includes('安全保障')) {
      tags.push('防衛');
    }
    
    // 災害
    if (text.includes('地震') || text.includes('台風') || text.includes('災害')) {
      tags.push('災害');
    }
    
    // 最大5タグ
    return [...new Set(tags)].slice(0, 5);
  }
}