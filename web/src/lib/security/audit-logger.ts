// 監査ログシステム
// すべての重要なアクションを記録

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export enum AuditAction {
  // 投稿関連
  POST_CREATE = 'POST_CREATE',
  POST_UPDATE = 'POST_UPDATE',
  POST_DELETE = 'POST_DELETE',
  POST_REPORT = 'POST_REPORT',
  POST_BLOCK = 'POST_BLOCK',
  POST_UNBLOCK = 'POST_UNBLOCK',
  
  // メディア関連
  MEDIA_UPLOAD = 'MEDIA_UPLOAD',
  MEDIA_DELETE = 'MEDIA_DELETE',
  
  // 管理関連
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_LOGOUT = 'ADMIN_LOGOUT',
  ADMIN_ACTION = 'ADMIN_ACTION',
  
  // セキュリティ関連
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  NG_WORD_DETECTED = 'NG_WORD_DETECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_BLOCKED = 'IP_BLOCKED',
  IP_UNBLOCKED = 'IP_UNBLOCKED',
  
  // システム関連
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  SYSTEM_WARNING = 'SYSTEM_WARNING',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
}

export enum AuditSeverity {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface AuditLogEntry {
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export class AuditLogger {
  /**
   * 監査ログを記録
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const timestamp = entry.timestamp || new Date();
      
      await db.execute({
        sql: `
          INSERT INTO audit_logs (
            action, severity, user_id, ip_address, user_agent,
            target_id, target_type, details, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          entry.action,
          entry.severity,
          entry.userId || null,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.targetId || null,
          entry.targetType || null,
          JSON.stringify(entry.details || {}),
          JSON.stringify(entry.metadata || {}),
          timestamp.toISOString(),
        ],
      });
      
      // 重要度が高い場合は追加アクション
      if (entry.severity === AuditSeverity.CRITICAL) {
        await this.handleCriticalEvent(entry);
      }
      
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // フォールバック: ファイルに書き込み
      await this.fallbackLog(entry);
    }
  }

  /**
   * 投稿作成の監査ログ
   */
  static async logPostCreate(
    postId: string,
    userId: string,
    ipAddress: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: AuditAction.POST_CREATE,
      severity: AuditSeverity.INFO,
      userId,
      ipAddress,
      targetId: postId,
      targetType: 'post',
      details,
    });
  }

  /**
   * 投稿削除の監査ログ
   */
  static async logPostDelete(
    postId: string,
    userId: string,
    ipAddress: string,
    reason?: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.POST_DELETE,
      severity: AuditSeverity.WARNING,
      userId,
      ipAddress,
      targetId: postId,
      targetType: 'post',
      details: { reason },
    });
  }

  /**
   * NGワード検出の監査ログ
   */
  static async logNGWordDetection(
    userId: string,
    ipAddress: string,
    detectedWords: string[],
    content: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.NG_WORD_DETECTED,
      severity: AuditSeverity.WARNING,
      userId,
      ipAddress,
      details: {
        detectedWords,
        contentLength: content.length,
        // 内容は部分的にマスク
        contentPreview: content.substring(0, 50) + '...',
      },
    });
  }

  /**
   * レート制限超過の監査ログ
   */
  static async logRateLimitExceeded(
    identifier: string,
    action: string,
    ipAddress: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.RATE_LIMIT_EXCEEDED,
      severity: AuditSeverity.WARNING,
      ipAddress,
      details: {
        identifier,
        limitedAction: action,
      },
    });
  }

  /**
   * 管理者アクションの監査ログ
   */
  static async logAdminAction(
    adminId: string,
    action: string,
    targetId: string,
    targetType: string,
    ipAddress: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: AuditAction.ADMIN_ACTION,
      severity: AuditSeverity.INFO,
      userId: adminId,
      ipAddress,
      targetId,
      targetType,
      details: {
        adminAction: action,
        ...details,
      },
    });
  }

  /**
   * 不審なアクティビティの監査ログ
   */
  static async logSuspiciousActivity(
    ipAddress: string,
    reasons: string[],
    score: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      severity: score > 80 ? AuditSeverity.CRITICAL : AuditSeverity.WARNING,
      ipAddress,
      details: {
        reasons,
        suspicionScore: score,
        ...details,
      },
    });
  }

  /**
   * システムエラーの監査ログ
   */
  static async logSystemError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action: AuditAction.SYSTEM_ERROR,
      severity: AuditSeverity.ERROR,
      details: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        context,
      },
    });
  }

  /**
   * 監査ログの検索
   */
  static async search(params: {
    action?: AuditAction;
    severity?: AuditSeverity;
    userId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const args: any[] = [];
    
    if (params.action) {
      sql += ' AND action = ?';
      args.push(params.action);
    }
    
    if (params.severity) {
      sql += ' AND severity = ?';
      args.push(params.severity);
    }
    
    if (params.userId) {
      sql += ' AND user_id = ?';
      args.push(params.userId);
    }
    
    if (params.ipAddress) {
      sql += ' AND ip_address = ?';
      args.push(params.ipAddress);
    }
    
    if (params.startDate) {
      sql += ' AND created_at >= ?';
      args.push(params.startDate.toISOString());
    }
    
    if (params.endDate) {
      sql += ' AND created_at <= ?';
      args.push(params.endDate.toISOString());
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (params.limit) {
      sql += ' LIMIT ?';
      args.push(params.limit);
    }
    
    if (params.offset) {
      sql += ' OFFSET ?';
      args.push(params.offset);
    }
    
    const result = await db.execute({ sql, args });
    
    return result.rows.map((row: any) => ({
      ...row,
      details: JSON.parse(row.details || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  /**
   * 監査ログの統計を取得
   */
  static async getStats(hours: number = 24): Promise<any> {
    const result = await db.execute({
      sql: `
        SELECT 
          action,
          severity,
          COUNT(*) as count
        FROM audit_logs
        WHERE created_at > datetime('now', '-${hours} hours')
        GROUP BY action, severity
        ORDER BY count DESC
      `,
      args: [],
    });
    
    return result.rows;
  }

  /**
   * IP別のアクティビティサマリ
   */
  static async getIPActivitySummary(ipAddress: string, days: number = 7): Promise<any> {
    const result = await db.execute({
      sql: `
        SELECT 
          DATE(created_at) as date,
          action,
          COUNT(*) as count
        FROM audit_logs
        WHERE ip_address = ?
          AND created_at > datetime('now', '-${days} days')
        GROUP BY DATE(created_at), action
        ORDER BY date DESC, count DESC
      `,
      args: [ipAddress],
    });
    
    return result.rows;
  }

  /**
   * 重要イベントの処理
   */
  private static async handleCriticalEvent(entry: AuditLogEntry): Promise<void> {
    // ここで通知やアラートを送信
    console.error('CRITICAL AUDIT EVENT:', entry);
    
    // 将来的にはメール通知やSlack通知を実装
    // await NotificationService.sendAlert(entry);
  }

  /**
   * フォールバックログ（DB書き込み失敗時）
   */
  private static async fallbackLog(entry: AuditLogEntry): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const logDir = path.join(process.cwd(), 'logs', 'audit');
    await fs.mkdir(logDir, { recursive: true });
    
    const filename = `audit-${new Date().toISOString().split('T')[0]}.log`;
    const filepath = path.join(logDir, filename);
    
    const logLine = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp || new Date(),
    }) + '\n';
    
    await fs.appendFile(filepath, logLine, 'utf8');
  }

  /**
   * 古いログのクリーンアップ
   */
  static async cleanup(daysToKeep: number = 90): Promise<number> {
    const result = await db.execute({
      sql: `
        DELETE FROM audit_logs
        WHERE created_at < datetime('now', '-${daysToKeep} days')
      `,
      args: [],
    });
    
    return result.rowsAffected || 0;
  }
}

export default AuditLogger;