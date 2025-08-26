// 高度な攻撃対策システム
// 粘着的な攻撃者の検出とブロック

import { createClient } from '@libsql/client';
import { AuditLogger, AuditAction, AuditSeverity } from './audit-logger';
import { createHash } from 'crypto';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

interface AttackPattern {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  windowMs: number;
  blockDurationMs: number;
}

export class AdvancedProtection {
  // 攻撃パターンの定義
  private static attackPatterns: AttackPattern[] = [
    // 連続的な同一内容の投稿（コピペ攻撃）
    {
      type: 'duplicate_content',
      severity: 'high',
      threshold: 3, // 3回同じ内容
      windowMs: 60 * 60 * 1000, // 1時間
      blockDurationMs: 24 * 60 * 60 * 1000, // 24時間ブロック
    },
    // 短時間での大量報告（報告スパム）
    {
      type: 'report_spam',
      severity: 'high',
      threshold: 10, // 10件の報告
      windowMs: 5 * 60 * 1000, // 5分
      blockDurationMs: 7 * 24 * 60 * 60 * 1000, // 1週間ブロック
    },
    // 削除後の再投稿（執拗な再投稿）
    {
      type: 'persistent_repost',
      severity: 'critical',
      threshold: 2, // 2回削除後の再投稿
      windowMs: 24 * 60 * 60 * 1000, // 24時間
      blockDurationMs: 30 * 24 * 60 * 60 * 1000, // 30日ブロック
    },
    // 複数アカウントからの協調攻撃
    {
      type: 'coordinated_attack',
      severity: 'critical',
      threshold: 5, // 5つの関連アカウント
      windowMs: 60 * 60 * 1000, // 1時間
      blockDurationMs: -1, // 永久ブロック
    },
  ];

  /**
   * デバイスフィンガープリントの生成
   * ブラウザの特徴から一意のIDを生成
   */
  static generateFingerprint(headers: Headers, ip: string): string {
    const components = [
      headers.get('User-Agent') || '',
      headers.get('Accept-Language') || '',
      headers.get('Accept-Encoding') || '',
      headers.get('Accept') || '',
      // Screen resolution, timezone等はクライアントサイドから送信される想定
      headers.get('X-Screen-Resolution') || '',
      headers.get('X-Timezone') || '',
      // IPアドレスの最初の3オクテット（サブネット）
      ip.split('.').slice(0, 3).join('.'),
    ];
    
    const fingerprint = createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
      .substring(0, 16);
    
    return fingerprint;
  }

  /**
   * 行動パターン分析
   * ユーザーの行動から攻撃者を特定
   */
  static async analyzeBehavior(
    userId: string,
    ip: string,
    fingerprint: string
  ): Promise<{
    isAttacker: boolean;
    confidence: number;
    patterns: string[];
    recommendation: string;
  }> {
    const patterns: string[] = [];
    let confidence = 0;

    // 1. 投稿頻度の分析
    const postFrequency = await db.execute({
      sql: `
        SELECT 
          COUNT(*) as total_posts,
          COUNT(DISTINCT DATE(created_at)) as active_days,
          AVG(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) as deletion_rate
        FROM posts
        WHERE owner_key = ?
          AND created_at > datetime('now', '-30 days')
      `,
      args: [userId],
    });

    if (postFrequency.rows.length > 0) {
      const stats = postFrequency.rows[0] as any;
      
      // 高頻度投稿
      if (stats.total_posts > 50) {
        patterns.push('high_frequency_posting');
        confidence += 20;
      }
      
      // 高い削除率
      if (stats.deletion_rate > 0.5) {
        patterns.push('high_deletion_rate');
        confidence += 30;
      }
    }

    // 2. 内容の類似性分析（同じフィンガープリントからの投稿）
    const contentSimilarity = await db.execute({
      sql: `
        SELECT 
          COUNT(*) as similar_posts,
          COUNT(DISTINCT content_hash) as unique_contents
        FROM (
          SELECT 
            p.id,
            SUBSTR(p.comment || p.title, 0, 100) as content_hash
          FROM posts p
          JOIN device_fingerprints df ON df.owner_key = p.owner_key
          WHERE df.fingerprint = ?
            AND p.created_at > datetime('now', '-7 days')
        )
      `,
      args: [fingerprint],
    }).catch(() => ({ rows: [] }));

    if (contentSimilarity.rows.length > 0) {
      const stats = contentSimilarity.rows[0] as any;
      
      if (stats.similar_posts > 10 && stats.unique_contents < 3) {
        patterns.push('repetitive_content');
        confidence += 40;
      }
    }

    // 3. 複数アカウントの関連性チェック
    const relatedAccounts = await this.findRelatedAccounts(fingerprint, ip);
    if (relatedAccounts.length > 2) {
      patterns.push('multiple_accounts');
      confidence += 30;
      
      if (relatedAccounts.length > 5) {
        patterns.push('sockpuppet_network');
        confidence += 20;
      }
    }

    // 4. 時間パターン分析（ボットの可能性）
    const timePattern = await db.execute({
      sql: `
        SELECT 
          strftime('%H', created_at) as hour,
          COUNT(*) as count
        FROM posts
        WHERE owner_key = ?
          AND created_at > datetime('now', '-7 days')
        GROUP BY hour
        ORDER BY count DESC
      `,
      args: [userId],
    });

    if (timePattern.rows.length > 0) {
      // 24時間均等に分散している場合はボットの可能性
      const hourCounts = timePattern.rows.map((r: any) => r.count);
      const avgCount = hourCounts.reduce((a, b) => a + b, 0) / hourCounts.length;
      const variance = hourCounts.reduce((a, b) => a + Math.pow(b - avgCount, 2), 0) / hourCounts.length;
      
      if (variance < 2 && hourCounts.length > 20) {
        patterns.push('bot_like_timing');
        confidence += 25;
      }
    }

    // 推奨アクション
    let recommendation = '監視継続';
    if (confidence >= 80) {
      recommendation = '即時ブロック推奨';
    } else if (confidence >= 60) {
      recommendation = '制限付きアクセス推奨';
    } else if (confidence >= 40) {
      recommendation = '要注意監視';
    }

    return {
      isAttacker: confidence >= 60,
      confidence: Math.min(confidence, 100),
      patterns,
      recommendation,
    };
  }

  /**
   * 関連アカウントの検出
   */
  private static async findRelatedAccounts(
    fingerprint: string,
    ip: string
  ): Promise<string[]> {
    // フィンガープリントテーブルに保存
    await db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS device_fingerprints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fingerprint TEXT NOT NULL,
          owner_key TEXT NOT NULL,
          ip_address TEXT,
          first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(fingerprint, owner_key)
        )
      `,
    }).catch(() => {});

    // 同じフィンガープリントまたはIPサブネットを使用するアカウント
    const subnet = ip.split('.').slice(0, 3).join('.');
    const result = await db.execute({
      sql: `
        SELECT DISTINCT owner_key
        FROM device_fingerprints
        WHERE fingerprint = ?
           OR ip_address LIKE ?
      `,
      args: [fingerprint, subnet + '.%'],
    }).catch(() => ({ rows: [] }));

    return result.rows.map((r: any) => r.owner_key);
  }

  /**
   * ハニーポットトラップ
   * 隠しフィールドやリンクを使用してボットを検出
   */
  static validateHoneypot(formData: any): boolean {
    // 隠しフィールドが入力されている場合はボット
    if (formData.email_confirm || formData.website || formData.phone_number) {
      return false; // ボットと判定
    }
    
    // 送信時間が短すぎる（3秒以内）
    if (formData.timestamp) {
      const submitTime = Date.now() - parseInt(formData.timestamp);
      if (submitTime < 3000) {
        return false; // ボットと判定
      }
    }
    
    return true; // 正常なユーザー
  }

  /**
   * 機械学習ベースの異常検出（簡易版）
   */
  static async detectAnomaly(
    userId: string,
    action: string,
    metadata: Record<string, any>
  ): Promise<{
    isAnomaly: boolean;
    score: number;
    features: string[];
  }> {
    const features: string[] = [];
    let anomalyScore = 0;

    // 過去の正常な行動パターンを学習
    const normalPattern = await db.execute({
      sql: `
        SELECT 
          AVG(posts_per_day) as avg_posts,
          AVG(report_rate) as avg_reports,
          AVG(deletion_rate) as avg_deletions
        FROM (
          SELECT 
            owner_key,
            COUNT(*) / MAX(1, JULIANDAY('now') - JULIANDAY(MIN(created_at))) as posts_per_day,
            SUM(report_count) * 1.0 / COUNT(*) as report_rate,
            SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as deletion_rate
          FROM posts
          WHERE created_at > datetime('now', '-90 days')
            AND report_count < 3  -- 正常なユーザーのみ
          GROUP BY owner_key
        )
      `,
    });

    if (normalPattern.rows.length > 0) {
      const baseline = normalPattern.rows[0] as any;
      
      // 現在のユーザーのパターン
      const userPattern = await db.execute({
        sql: `
          SELECT 
            COUNT(*) / MAX(1, JULIANDAY('now') - JULIANDAY(MIN(created_at))) as posts_per_day,
            SUM(report_count) * 1.0 / COUNT(*) as report_rate,
            SUM(CASE WHEN is_deleted = 1 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as deletion_rate
          FROM posts
          WHERE owner_key = ?
            AND created_at > datetime('now', '-30 days')
        `,
        args: [userId],
      });

      if (userPattern.rows.length > 0) {
        const user = userPattern.rows[0] as any;
        
        // 標準偏差の3倍を超える場合は異常
        if (user.posts_per_day > baseline.avg_posts * 3) {
          features.push('excessive_posting');
          anomalyScore += 40;
        }
        
        if (user.report_rate > baseline.avg_reports * 5) {
          features.push('high_report_rate');
          anomalyScore += 30;
        }
        
        if (user.deletion_rate > baseline.avg_deletions * 3) {
          features.push('high_deletion_rate');
          anomalyScore += 30;
        }
      }
    }

    // アクション固有の異常検出
    if (action === 'post_create' && metadata.contentLength) {
      // 異常に長い/短いコンテンツ
      if (metadata.contentLength > 10000 || metadata.contentLength < 5) {
        features.push('unusual_content_length');
        anomalyScore += 20;
      }
    }

    return {
      isAnomaly: anomalyScore >= 50,
      score: Math.min(anomalyScore, 100),
      features,
    };
  }

  /**
   * 総合的な脅威評価
   */
  static async assessThreat(
    userId: string,
    ip: string,
    fingerprint: string,
    action: string
  ): Promise<{
    threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    shouldBlock: boolean;
    blockDuration?: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let threatScore = 0;

    // 1. 行動分析
    const behavior = await this.analyzeBehavior(userId, ip, fingerprint);
    if (behavior.isAttacker) {
      threatScore += behavior.confidence;
      reasons.push(...behavior.patterns);
    }

    // 2. 異常検出
    const anomaly = await this.detectAnomaly(userId, action, {});
    if (anomaly.isAnomaly) {
      threatScore += anomaly.score * 0.5;
      reasons.push(...anomaly.features);
    }

    // 3. 既存の違反履歴
    const violations = await db.execute({
      sql: `
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE (user_id = ? OR ip_address = ?)
          AND severity IN ('WARNING', 'ERROR', 'CRITICAL')
          AND created_at > datetime('now', '-7 days')
      `,
      args: [userId, ip],
    });

    if (violations.rows.length > 0) {
      const count = (violations.rows[0] as any).count;
      if (count > 10) {
        threatScore += 30;
        reasons.push('high_violation_count');
      }
    }

    // 脅威レベルの判定
    let threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    let shouldBlock = false;
    let blockDuration = 0;

    if (threatScore >= 90) {
      threatLevel = 'critical';
      shouldBlock = true;
      blockDuration = 30 * 24 * 60 * 60 * 1000; // 30日
    } else if (threatScore >= 70) {
      threatLevel = 'high';
      shouldBlock = true;
      blockDuration = 7 * 24 * 60 * 60 * 1000; // 7日
    } else if (threatScore >= 50) {
      threatLevel = 'medium';
      shouldBlock = true;
      blockDuration = 24 * 60 * 60 * 1000; // 24時間
    } else if (threatScore >= 30) {
      threatLevel = 'low';
    } else {
      threatLevel = 'none';
    }

    // 監査ログ
    if (shouldBlock) {
      await AuditLogger.log({
        action: AuditAction.IP_BLOCKED,
        severity: AuditSeverity.CRITICAL,
        userId,
        ipAddress: ip,
        details: {
          threatLevel,
          threatScore,
          reasons,
          blockDuration,
          fingerprint,
        },
      });
    }

    return {
      threatLevel,
      shouldBlock,
      blockDuration,
      reasons,
    };
  }
}

export default AdvancedProtection;