import { createClient } from '@libsql/client';
import { Normalizer } from './normalizer';

export class Deduplicator {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * 重複チェック
   */
  async isDuplicate(url: string, title: string): Promise<{
    isDuplicate: boolean;
    reason?: 'url' | 'title';
    existingId?: string;
  }> {
    // URL完全一致チェック
    const urlHash = Normalizer.hashUrl(url);
    const urlCheck = await this.db.execute({
      sql: `SELECT id FROM feed_items WHERE hash_url = ? LIMIT 1`,
      args: [urlHash],
    });

    if (urlCheck.rows.length > 0) {
      return {
        isDuplicate: true,
        reason: 'url',
        existingId: urlCheck.rows[0].id as string,
      };
    }

    // 既存postsテーブルもチェック
    const normalizedUrl = Normalizer.normalizeUrl(url);
    const postCheck = await this.db.execute({
      sql: `SELECT id FROM posts WHERE url = ? LIMIT 1`,
      args: [normalizedUrl],
    });

    if (postCheck.rows.length > 0) {
      return {
        isDuplicate: true,
        reason: 'url',
        existingId: postCheck.rows[0].id as string,
      };
    }

    // タイトル類似度チェック
    if (title && title.length > 10) {
      const titleSimilar = await this.checkTitleSimilarity(title);
      if (titleSimilar.isSimilar) {
        return {
          isDuplicate: true,
          reason: 'title',
          existingId: titleSimilar.existingId,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * タイトル類似度チェック
   */
  private async checkTitleSimilarity(title: string): Promise<{
    isSimilar: boolean;
    existingId?: string;
    similarity?: number;
  }> {
    const normalizedTitle = Normalizer.normalizeTitle(title);
    const titleHash = Normalizer.hashTitle(title);

    // 完全一致ハッシュチェック
    const exactMatch = await this.db.execute({
      sql: `SELECT id FROM feed_items WHERE hash_title = ? LIMIT 1`,
      args: [titleHash],
    });

    if (exactMatch.rows.length > 0) {
      return {
        isSimilar: true,
        existingId: exactMatch.rows[0].id as string,
        similarity: 1.0,
      };
    }

    // 最近の記事から類似タイトル検索（24時間以内）
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
    const recentItems = await this.db.execute({
      sql: `SELECT id, title FROM feed_items 
            WHERE created_at > ? AND title IS NOT NULL 
            ORDER BY created_at DESC LIMIT 100`,
      args: [oneDayAgo],
    });

    for (const row of recentItems.rows) {
      const existingTitle = row.title as string;
      const similarity = this.calculateSimilarity(normalizedTitle, Normalizer.normalizeTitle(existingTitle));
      
      // 80%以上の類似度で重複とみなす
      if (similarity > 0.8) {
        return {
          isSimilar: true,
          existingId: row.id as string,
          similarity,
        };
      }
    }

    return { isSimilar: false };
  }

  /**
   * Jaccard係数による類似度計算
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(this.getNGrams(str1, 2));
    const set2 = new Set(this.getNGrams(str2, 2));

    if (set1.size === 0 || set2.size === 0) {
      return str1 === str2 ? 1 : 0;
    }

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * N-gram生成
   */
  private getNGrams(str: string, n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.push(str.substring(i, i + n));
    }
    return ngrams;
  }

  /**
   * バッチ重複チェック（高速化）
   */
  async checkBatch(items: Array<{ url: string; title: string }>): Promise<Map<number, boolean>> {
    const results = new Map<number, boolean>();
    
    // URLハッシュ一括生成
    const urlHashes = items.map(item => Normalizer.hashUrl(item.url));
    
    // 既存URLハッシュ取得
    const existingHashes = await this.db.execute({
      sql: `SELECT hash_url FROM feed_items WHERE hash_url IN (${urlHashes.map(() => '?').join(',')})`,
      args: urlHashes,
    });
    
    const existingHashSet = new Set(existingHashes.rows.map(r => r.hash_url));
    
    // 結果マッピング
    items.forEach((item, index) => {
      const hash = urlHashes[index];
      results.set(index, existingHashSet.has(hash));
    });
    
    return results;
  }
}