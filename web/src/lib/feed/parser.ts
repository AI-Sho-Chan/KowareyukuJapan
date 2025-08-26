import { fetchUrlWithSsrfGuard } from '../ssrf';

export interface FeedItem {
  guid: string;
  title: string;
  url: string;
  content?: string;
  summary?: string;
  author?: string;
  publishedAt?: Date;
  categories?: string[];
}

export interface ParsedFeed {
  title?: string;
  description?: string;
  link?: string;
  items: FeedItem[];
}

export class FeedParser {
  /**
   * RSS/Atom/JSONフィードをパース
   */
  static async parse(feedUrl: string): Promise<ParsedFeed> {
    // SSRFガードでフィード取得
    const response = await fetchUrlWithSsrfGuard(feedUrl, {
      allowHttp: true, // RSSは HTTP も多い
      timeoutMs: 8000,
      maxSize: 3 * 1024 * 1024, // 3MB
    });

    if (!response.ok) {
      throw new Error(`Feed fetch failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    // JSON Feed
    if (contentType.includes('json') || feedUrl.endsWith('.json')) {
      return this.parseJsonFeed(text);
    }

    // XML (RSS/Atom)
    if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom') || 
        text.trim().startsWith('<?xml') || text.includes('<rss') || text.includes('<feed')) {
      return this.parseXmlFeed(text);
    }

    throw new Error('Unsupported feed format');
  }

  /**
   * JSON Feed 1.1 パース
   */
  private static parseJsonFeed(text: string): ParsedFeed {
    const json = JSON.parse(text);
    
    const items: FeedItem[] = (json.items || []).map((item: any) => ({
      guid: item.id || item.url,
      title: item.title || '',
      url: item.url || item.external_url || '',
      content: item.content_html || item.content_text,
      summary: item.summary,
      author: item.author?.name || item.authors?.[0]?.name,
      publishedAt: item.date_published ? new Date(item.date_published) : undefined,
      categories: item.tags,
    }));

    return {
      title: json.title,
      description: json.description,
      link: json.home_page_url || json.feed_url,
      items,
    };
  }

  /**
   * RSS/Atom XMLパース（簡易版）
   */
  private static parseXmlFeed(text: string): ParsedFeed {
    const items: FeedItem[] = [];
    
    // RSS 2.0
    const rssItems = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    for (const itemXml of rssItems) {
      items.push(this.parseRssItem(itemXml));
    }

    // Atom
    if (items.length === 0) {
      const atomEntries = text.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
      for (const entryXml of atomEntries) {
        items.push(this.parseAtomEntry(entryXml));
      }
    }

    // フィード情報
    const title = this.extractXmlValue(text, 'title');
    const description = this.extractXmlValue(text, 'description') || this.extractXmlValue(text, 'subtitle');
    const link = this.extractXmlValue(text, 'link');

    return {
      title,
      description,
      link,
      items,
    };
  }

  /**
   * RSS item パース
   */
  private static parseRssItem(xml: string): FeedItem {
    return {
      guid: this.extractXmlValue(xml, 'guid') || this.extractXmlValue(xml, 'link') || '',
      title: this.extractXmlValue(xml, 'title') || '',
      url: this.extractXmlValue(xml, 'link') || '',
      content: this.extractXmlValue(xml, 'content:encoded') || this.extractXmlValue(xml, 'description'),
      summary: this.extractXmlValue(xml, 'description'),
      author: this.extractXmlValue(xml, 'author') || this.extractXmlValue(xml, 'dc:creator'),
      publishedAt: this.parseDate(this.extractXmlValue(xml, 'pubDate') || this.extractXmlValue(xml, 'dc:date')),
      categories: this.extractXmlValues(xml, 'category'),
    };
  }

  /**
   * Atom entry パース
   */
  private static parseAtomEntry(xml: string): FeedItem {
    const linkMatch = xml.match(/<link[^>]*href="([^"]+)"/);
    const url = linkMatch ? linkMatch[1] : '';
    
    return {
      guid: this.extractXmlValue(xml, 'id') || url,
      title: this.extractXmlValue(xml, 'title') || '',
      url,
      content: this.extractXmlValue(xml, 'content') || this.extractXmlValue(xml, 'summary'),
      summary: this.extractXmlValue(xml, 'summary'),
      author: this.extractXmlValue(xml, 'author/name') || this.extractXmlValue(xml, 'author'),
      publishedAt: this.parseDate(this.extractXmlValue(xml, 'published') || this.extractXmlValue(xml, 'updated')),
      categories: this.extractXmlValues(xml, 'category'),
    };
  }

  /**
   * XML値抽出
   */
  private static extractXmlValue(xml: string, tag: string): string | undefined {
    const pattern = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i');
    const match = xml.match(pattern);
    if (match) {
      const value = match[1] || match[2];
      return value?.trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '');
    }
    return undefined;
  }

  /**
   * 複数XML値抽出
   */
  private static extractXmlValues(xml: string, tag: string): string[] {
    const pattern = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'gi');
    const matches = xml.match(pattern) || [];
    return matches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
  }

  /**
   * 日付パース
   */
  private static parseDate(dateStr?: string): Date | undefined {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  }
}