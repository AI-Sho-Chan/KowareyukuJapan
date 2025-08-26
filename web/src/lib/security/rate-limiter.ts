// レート制限システム
// DDoS攻撃やスパムから保護

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

interface RateLimitConfig {
  maxRequests: number;  // 最大リクエスト数
  windowMs: number;     // 時間窓（ミリ秒）
  blockDurationMs?: number; // ブロック期間（ミリ秒）
}

interface RateLimitStore {
  count: number;
  firstRequest: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private static stores: Map<string, Map<string, RateLimitStore>> = new Map();
  
  // デフォルト設定
  private static configs: Map<string, RateLimitConfig> = new Map([
    // API投稿: 5分で3投稿まで（スパム対策強化）
    ['post:create', {
      maxRequests: 3,
      windowMs: 5 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000, // 30分ブロック
    }],
    
    // API読み込み: 1分で60リクエストまで
    ['api:read', {
      maxRequests: 60,
      windowMs: 60 * 1000,
      blockDurationMs: 5 * 60 * 1000, // 5分ブロック
    }],
    
    // 管理画面: 1分で30リクエストまで
    ['admin:access', {
      maxRequests: 30,
      windowMs: 60 * 1000,
      blockDurationMs: 10 * 60 * 1000, // 10分ブロック
    }],
    
    // 画像アップロード: 10分で10枚まで
    ['media:upload', {
      maxRequests: 10,
      windowMs: 10 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000, // 30分ブロック
    }],
    
    // レポート送信: 1時間で5件まで
    ['report:submit', {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000, // 1時間ブロック
    }],
  ]);

  /**
   * レート制限チェック
   */
  static async check(
    identifier: string,  // IPアドレスやユーザーID
    action: string,       // アクション種別
    customConfig?: RateLimitConfig
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const config = customConfig || this.configs.get(action) || {
      maxRequests: 100,
      windowMs: 60 * 1000,
    };

    const now = Date.now();
    const storeKey = `${action}:${identifier}`;
    
    // アクション別のストアを取得または作成
    if (!this.stores.has(action)) {
      this.stores.set(action, new Map());
    }
    const actionStore = this.stores.get(action)!;
    
    // 識別子別のレート制限情報を取得
    let limitInfo = actionStore.get(identifier);
    
    // 初回リクエストまたは時間窓が過ぎた場合
    if (!limitInfo || (now - limitInfo.firstRequest) > config.windowMs) {
      limitInfo = {
        count: 0,
        firstRequest: now,
      };
      actionStore.set(identifier, limitInfo);
    }
    
    // ブロック中かチェック
    if (limitInfo.blockedUntil && now < limitInfo.blockedUntil) {
      const retryAfter = Math.ceil((limitInfo.blockedUntil - now) / 1000);
      
      // DBに記録
      await this.logRateLimitHit(identifier, action, false, 'blocked');
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: limitInfo.blockedUntil,
        retryAfter,
      };
    }
    
    // リクエスト数をインクリメント
    limitInfo.count++;
    
    // 制限を超えた場合
    if (limitInfo.count > config.maxRequests) {
      limitInfo.blockedUntil = now + (config.blockDurationMs || config.windowMs);
      
      // DBに記録
      await this.logRateLimitHit(identifier, action, false, 'exceeded');
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: limitInfo.blockedUntil,
        retryAfter: Math.ceil((config.blockDurationMs || config.windowMs) / 1000),
      };
    }
    
    // 許可
    const remaining = config.maxRequests - limitInfo.count;
    const resetAt = limitInfo.firstRequest + config.windowMs;
    
    // 成功したリクエストも記録（サンプリング）
    if (Math.random() < 0.1) { // 10%をサンプリング
      await this.logRateLimitHit(identifier, action, true, 'allowed');
    }
    
    return {
      allowed: true,
      remaining,
      resetAt,
    };
  }

  /**
   * IPアドレスベースのレート制限
   */
  static async checkIP(
    ip: string,
    action: string,
    customConfig?: RateLimitConfig
  ) {
    // IPアドレスを正規化
    const normalizedIP = this.normalizeIP(ip);
    return this.check(normalizedIP, action, customConfig);
  }

  /**
   * ユーザーベースのレート制限
   */
  static async checkUser(
    userId: string,
    action: string,
    customConfig?: RateLimitConfig
  ) {
    return this.check(`user:${userId}`, action, customConfig);
  }

  /**
   * 複合的なレート制限（IPとユーザー両方）
   */
  static async checkCombined(
    ip: string,
    userId: string | null,
    action: string,
    customConfig?: RateLimitConfig
  ) {
    // IPチェック
    const ipCheck = await this.checkIP(ip, action, customConfig);
    if (!ipCheck.allowed) return ipCheck;
    
    // ユーザーIDがある場合は追加チェック
    if (userId) {
      const userCheck = await this.checkUser(userId, action, customConfig);
      if (!userCheck.allowed) return userCheck;
    }
    
    return ipCheck;
  }

  /**
   * レート制限をリセット（管理者用）
   */
  static reset(identifier: string, action?: string): void {
    if (action) {
      const actionStore = this.stores.get(action);
      if (actionStore) {
        actionStore.delete(identifier);
      }
    } else {
      // すべてのアクションからリセット
      this.stores.forEach(actionStore => {
        actionStore.delete(identifier);
      });
    }
  }

  /**
   * IPアドレスの正規化
   */
  private static normalizeIP(ip: string): string {
    // IPv6の場合は最初の64ビットで集約
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':');
    }
    // IPv4はそのまま
    return ip;
  }

  /**
   * レート制限ヒットをDBに記録
   */
  private static async logRateLimitHit(
    identifier: string,
    action: string,
    allowed: boolean,
    reason: string
  ): Promise<void> {
    try {
      await db.execute({
        sql: `
          INSERT INTO rate_limit_logs (
            identifier, action, allowed, reason, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `,
        args: [identifier, action, allowed ? 1 : 0, reason],
      });
    } catch (error) {
      // ログテーブルがない場合は作成
      await db.execute(`
        CREATE TABLE IF NOT EXISTS rate_limit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          identifier TEXT NOT NULL,
          action TEXT NOT NULL,
          allowed BOOLEAN NOT NULL,
          reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // リトライ
      await db.execute({
        sql: `
          INSERT INTO rate_limit_logs (
            identifier, action, allowed, reason, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `,
        args: [identifier, action, allowed ? 1 : 0, reason],
      });
    }
  }

  /**
   * 統計情報を取得
   */
  static async getStats(hours: number = 24): Promise<any> {
    const result = await db.execute({
      sql: `
        SELECT 
          action,
          COUNT(*) as total_requests,
          SUM(CASE WHEN allowed = 1 THEN 1 ELSE 0 END) as allowed_requests,
          SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) as blocked_requests,
          COUNT(DISTINCT identifier) as unique_identifiers
        FROM rate_limit_logs
        WHERE created_at > datetime('now', '-${hours} hours')
        GROUP BY action
      `,
      args: [],
    });
    
    return result.rows;
  }

  /**
   * 不審なアクティビティを検出
   */
  static async detectSuspiciousActivity(identifier: string): Promise<{
    isSuspicious: boolean;
    score: number;
    reasons: string[];
  }> {
    const result = await db.execute({
      sql: `
        SELECT 
          action,
          COUNT(*) as request_count,
          SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) as blocked_count
        FROM rate_limit_logs
        WHERE identifier = ?
          AND created_at > datetime('now', '-1 hour')
        GROUP BY action
      `,
      args: [identifier],
    });
    
    let score = 0;
    const reasons: string[] = [];
    
    for (const row of result.rows) {
      const r = row as any;
      
      // ブロック率が高い
      if (r.blocked_count > 0) {
        const blockRate = r.blocked_count / r.request_count;
        if (blockRate > 0.5) {
          score += 50;
          reasons.push(`High block rate for ${r.action}: ${Math.round(blockRate * 100)}%`);
        }
      }
      
      // 短時間での大量リクエスト
      if (r.request_count > 100) {
        score += 30;
        reasons.push(`Excessive requests for ${r.action}: ${r.request_count}`);
      }
    }
    
    return {
      isSuspicious: score >= 50,
      score,
      reasons,
    };
  }
}

// Middleware用のヘルパー関数
export function getRateLimitHeaders(result: {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': '60',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };
  
  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  
  return headers;
}

export default RateLimiter;