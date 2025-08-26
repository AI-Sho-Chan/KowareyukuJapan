// 報告システム
// 不適切な投稿の報告と処理

import { createClient } from '@libsql/client';
import { AuditLogger, AuditAction, AuditSeverity } from './audit-logger';
import { notificationSystem, NotificationType } from './notification-system';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  ILLEGAL_CONTENT = 'illegal_content',
  MISINFORMATION = 'misinformation',
  PERSONAL_INFO = 'personal_info',
  COPYRIGHT = 'copyright',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated',
}

export enum ReportAction {
  NO_ACTION = 'no_action',
  WARNING = 'warning',
  CONTENT_REMOVED = 'content_removed',
  USER_SUSPENDED = 'user_suspended',
  USER_BANNED = 'user_banned',
  IP_BLOCKED = 'ip_blocked',
}

interface Report {
  id: string;
  postId: string;
  reporterId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  action?: ReportAction;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export class ReportSystem {
  /**
   * 報告を作成
   */
  static async createReport(params: {
    postId: string;
    reporterId: string;
    reason: ReportReason;
    description?: string;
    ipAddress: string;
  }): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      // 重複報告チェック
      const existing = await db.execute({
        sql: `
          SELECT id FROM reports
          WHERE post_id = ? AND reporter_id = ?
            AND status != 'dismissed'
            AND created_at > datetime('now', '-7 days')
        `,
        args: [params.postId, params.reporterId],
      });
      
      if (existing.rows.length > 0) {
        return {
          success: false,
          error: 'You have already reported this post recently',
        };
      }
      
      const reportId = Math.random().toString(36).slice(2, 10);
      
      // 報告を作成
      await db.execute({
        sql: `
          INSERT INTO reports (
            id, post_id, reporter_id, reason, description,
            status, ip_address, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        args: [
          reportId,
          params.postId,
          params.reporterId,
          params.reason,
          params.description || null,
          ReportStatus.PENDING,
          params.ipAddress,
        ],
      });
      
      // 投稿の報告カウントを更新
      await db.execute({
        sql: 'UPDATE posts SET report_count = report_count + 1 WHERE id = ?',
        args: [params.postId],
      });
      
      // 監査ログ
      await AuditLogger.log({
        action: AuditAction.POST_REPORT,
        severity: AuditSeverity.INFO,
        userId: params.reporterId,
        ipAddress: params.ipAddress,
        targetId: params.postId,
        targetType: 'post',
        details: {
          reportId,
          reason: params.reason,
        },
      });
      
      // 自動エスカレーション判定
      await this.checkAutoEscalation(params.postId);
      
      return { success: true, reportId };
      
    } catch (error) {
      console.error('Failed to create report:', error);
      return {
        success: false,
        error: 'Failed to submit report',
      };
    }
  }

  /**
   * 報告を処理
   */
  static async processReport(params: {
    reportId: string;
    reviewerId: string;
    action: ReportAction;
    notes?: string;
  }): Promise<boolean> {
    try {
      // 報告を更新
      await db.execute({
        sql: `
          UPDATE reports
          SET status = ?,
              action_taken = ?,
              resolved_by = ?,
              resolved_at = datetime('now'),
              notes = ?
          WHERE id = ?
        `,
        args: [
          ReportStatus.RESOLVED,
          params.action,
          params.reviewerId,
          params.notes || null,
          params.reportId,
        ],
      });
      
      // アクションに応じた処理
      const report = await this.getReport(params.reportId);
      if (!report) return false;
      
      switch (params.action) {
        case ReportAction.CONTENT_REMOVED:
          await this.removeContent(report.post_id);
          break;
        case ReportAction.USER_SUSPENDED:
          await this.suspendUser(report.post_id);
          break;
        case ReportAction.USER_BANNED:
          await this.banUser(report.post_id);
          break;
        case ReportAction.IP_BLOCKED:
          await this.blockIP(report.post_id);
          break;
      }
      
      // 監査ログ
      await AuditLogger.logAdminAction(
        params.reviewerId,
        'PROCESS_REPORT',
        params.reportId,
        'report',
        '', // IPアドレスは後で追加
        {
          action: params.action,
          notes: params.notes,
        }
      );
      
      return true;
      
    } catch (error) {
      console.error('Failed to process report:', error);
      return false;
    }
  }

  /**
   * 報告の一覧を取得
   */
  static async getReports(params: {
    status?: ReportStatus;
    postId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let sql = `
      SELECT 
        r.*,
        p.title as post_title,
        p.comment as post_comment,
        p.url as post_url
      FROM reports r
      LEFT JOIN posts p ON r.post_id = p.id
      WHERE 1=1
    `;
    const args: any[] = [];
    
    if (params.status) {
      sql += ' AND r.status = ?';
      args.push(params.status);
    }
    
    if (params.postId) {
      sql += ' AND r.post_id = ?';
      args.push(params.postId);
    }
    
    sql += ' ORDER BY r.created_at DESC';
    
    if (params.limit) {
      sql += ' LIMIT ?';
      args.push(params.limit);
    }
    
    if (params.offset) {
      sql += ' OFFSET ?';
      args.push(params.offset);
    }
    
    const result = await db.execute({ sql, args });
    return result.rows;
  }

  /**
   * 単一の報告を取得
   */
  static async getReport(reportId: string): Promise<any> {
    const result = await db.execute({
      sql: 'SELECT * FROM reports WHERE id = ?',
      args: [reportId],
    });
    
    return result.rows[0] || null;
  }

  /**
   * 自動エスカレーション判定
   */
  private static async checkAutoEscalation(postId: string): Promise<void> {
    // 同じ投稿への報告数をチェック
    const result = await db.execute({
      sql: `
        SELECT COUNT(*) as report_count
        FROM reports
        WHERE post_id = ?
          AND status = 'pending'
          AND created_at > datetime('now', '-24 hours')
      `,
      args: [postId],
    });
    
    const reportCount = (result.rows[0] as any).report_count;
    
    // 3件以上で管理者に通知
    if (reportCount >= 3) {
      await db.execute({
        sql: `
          UPDATE reports
          SET status = ?
          WHERE post_id = ? AND status = 'pending'
        `,
        args: [ReportStatus.REVIEWING, postId],
      });
      
      // 管理者への通知
      await this.notifyAdmin(postId, reportCount, 'review_required');
      
      // 監査ログ
      await AuditLogger.log({
        action: AuditAction.POST_REPORT,
        severity: AuditSeverity.WARNING,
        targetId: postId,
        targetType: 'post',
        details: {
          reason: 'multiple_reports',
          reportCount,
          action: 'admin_notified',
        },
      });
    }
    
    // 10件以上で自動非公開
    if (reportCount >= 10) {
      await db.execute({
        sql: `
          UPDATE reports
          SET status = ?
          WHERE post_id = ? AND status != 'resolved'
        `,
        args: [ReportStatus.ESCALATED, postId],
      });
      
      // 投稿を自動的に非公開にする
      await db.execute({
        sql: 'UPDATE posts SET is_published = 0, auto_hidden = 1, auto_hidden_at = datetime("now") WHERE id = ?',
        args: [postId],
      });
      
      // 管理者への緊急通知
      await this.notifyAdmin(postId, reportCount, 'auto_hidden');
      
      // 監査ログ
      await AuditLogger.log({
        action: AuditAction.POST_BLOCK,
        severity: AuditSeverity.CRITICAL,
        targetId: postId,
        targetType: 'post',
        details: {
          reason: 'auto_escalation',
          reportCount,
          action: 'auto_hidden',
        },
      });
    }
  }
  
  /**
   * 管理者への通知
   */
  private static async notifyAdmin(postId: string, reportCount: number, type: string): Promise<void> {
    // 投稿情報を取得
    const postResult = await db.execute({
      sql: 'SELECT title, handle, url, comment FROM posts WHERE id = ?',
      args: [postId],
    });
    
    const post = postResult.rows[0] || {};
    
    // 管理画面用の通知をデータベースに記録
    await db.execute({
      sql: `
        INSERT INTO admin_notifications (
          type, post_id, report_count, message, created_at, is_read
        ) VALUES (?, ?, ?, ?, datetime('now'), 0)
      `,
      args: [
        type,
        postId,
        reportCount,
        type === 'auto_hidden' 
          ? `緊急: 投稿 ${postId} が${reportCount}件の報告により自動非公開になりました`
          : `注意: 投稿 ${postId} が${reportCount}件の報告を受けています`,
      ],
    }).catch(() => {
      // テーブルがない場合は作成
      db.execute(`
        CREATE TABLE IF NOT EXISTS admin_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          post_id TEXT,
          report_count INTEGER,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).then(() => {
        // リトライ
        db.execute({
          sql: `
            INSERT INTO admin_notifications (
              type, post_id, report_count, message, created_at, is_read
            ) VALUES (?, ?, ?, ?, datetime('now'), 0)
          `,
          args: [type, postId, reportCount, 
            type === 'auto_hidden' 
              ? `緊急: 投稿 ${postId} が${reportCount}件の報告により自動非公開になりました`
              : `注意: 投稿 ${postId} が${reportCount}件の報告を受けています`
          ],
        });
      });
    });
    
    // 通知システムを使用してLINE/Email通知
    await notificationSystem.notifyReportThreshold(postId, reportCount, post);
  }

  /**
   * コンテンツを削除
   */
  private static async removeContent(postId: string): Promise<void> {
    await db.execute({
      sql: 'UPDATE posts SET is_published = 0, is_deleted = 1 WHERE id = ?',
      args: [postId],
    });
  }

  /**
   * ユーザーをサスペンド
   */
  private static async suspendUser(postId: string): Promise<void> {
    const result = await db.execute({
      sql: 'SELECT owner_key FROM posts WHERE id = ?',
      args: [postId],
    });
    
    if (result.rows.length > 0) {
      const ownerKey = (result.rows[0] as any).owner_key;
      
      // ユーザーの全投稿を非公開に
      await db.execute({
        sql: 'UPDATE posts SET is_published = 0 WHERE owner_key = ?',
        args: [ownerKey],
      });
      
      // ブロックリストに追加（一時的）
      await db.execute({
        sql: `
          INSERT INTO blocked_users (owner_key, reason, blocked_until, created_at)
          VALUES (?, 'suspended', datetime('now', '+7 days'), datetime('now'))
        `,
        args: [ownerKey],
      });
    }
  }

  /**
   * ユーザーをBAN
   */
  private static async banUser(postId: string): Promise<void> {
    const result = await db.execute({
      sql: 'SELECT owner_key FROM posts WHERE id = ?',
      args: [postId],
    });
    
    if (result.rows.length > 0) {
      const ownerKey = (result.rows[0] as any).owner_key;
      
      // ユーザーの全投稿を削除
      await db.execute({
        sql: 'UPDATE posts SET is_published = 0, is_deleted = 1 WHERE owner_key = ?',
        args: [ownerKey],
      });
      
      // ブロックリストに追加（永久）
      await db.execute({
        sql: `
          INSERT INTO blocked_users (owner_key, reason, created_at)
          VALUES (?, 'banned', datetime('now'))
        `,
        args: [ownerKey],
      });
    }
  }

  /**
   * IPをブロック
   */
  private static async blockIP(postId: string): Promise<void> {
    // 報告から IPアドレスを取得
    const result = await db.execute({
      sql: `
        SELECT DISTINCT ip_address
        FROM reports
        WHERE post_id = ?
      `,
      args: [postId],
    });
    
    for (const row of result.rows) {
      const ipAddress = (row as any).ip_address;
      if (ipAddress) {
        await db.execute({
          sql: `
            INSERT INTO blocked_ips (ip_address, reason, created_at)
            VALUES (?, 'reported_content', datetime('now'))
            ON CONFLICT(ip_address) DO NOTHING
          `,
          args: [ipAddress],
        });
        
        // 監査ログ
        await AuditLogger.log({
          action: AuditAction.IP_BLOCKED,
          severity: AuditSeverity.WARNING,
          ipAddress,
          targetId: postId,
          targetType: 'post',
          details: {
            reason: 'reported_content',
          },
        });
      }
    }
  }

  /**
   * 報告統計を取得
   */
  static async getStats(days: number = 7): Promise<any> {
    const result = await db.execute({
      sql: `
        SELECT 
          reason,
          status,
          COUNT(*) as count,
          COUNT(DISTINCT post_id) as unique_posts,
          COUNT(DISTINCT reporter_id) as unique_reporters
        FROM reports
        WHERE created_at > datetime('now', '-${days} days')
        GROUP BY reason, status
        ORDER BY count DESC
      `,
      args: [],
    });
    
    return result.rows;
  }

  /**
   * トップ報告者を取得（スパム報告者の検出）
   */
  static async getTopReporters(days: number = 7): Promise<any[]> {
    const result = await db.execute({
      sql: `
        SELECT 
          reporter_id,
          COUNT(*) as report_count,
          COUNT(DISTINCT post_id) as unique_posts,
          SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed_count
        FROM reports
        WHERE created_at > datetime('now', '-${days} days')
        GROUP BY reporter_id
        HAVING report_count > 5
        ORDER BY report_count DESC
        LIMIT 20
      `,
      args: [],
    });
    
    return result.rows;
  }
}

// ブロックリストのチェック用関数
export async function isBlocked(ownerKey: string, ipAddress: string): Promise<{
  blocked: boolean;
  reason?: string;
  until?: Date;
}> {
  // ユーザーキーチェック
  const userResult = await db.execute({
    sql: `
      SELECT reason, blocked_until
      FROM blocked_users
      WHERE owner_key = ?
        AND (blocked_until IS NULL OR blocked_until > datetime('now'))
    `,
    args: [ownerKey],
  });
  
  if (userResult.rows.length > 0) {
    const row = userResult.rows[0] as any;
    return {
      blocked: true,
      reason: row.reason,
      until: row.blocked_until ? new Date(row.blocked_until) : undefined,
    };
  }
  
  // IPアドレスチェック
  const ipResult = await db.execute({
    sql: `
      SELECT reason, blocked_until
      FROM blocked_ips
      WHERE ip_address = ?
        AND (blocked_until IS NULL OR blocked_until > datetime('now'))
    `,
    args: [ipAddress],
  });
  
  if (ipResult.rows.length > 0) {
    const row = ipResult.rows[0] as any;
    return {
      blocked: true,
      reason: row.reason,
      until: row.blocked_until ? new Date(row.blocked_until) : undefined,
    };
  }
  
  return { blocked: false };
}

export default ReportSystem;