// 通知システム（LINE/Email対応）

import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export enum NotificationType {
  ADMIN_ALERT = 'admin_alert',
  REPORT_THRESHOLD = 'report_threshold',
  AUTO_HIDE = 'auto_hide',
  SECURITY_THREAT = 'security_threat',
  RATE_LIMIT_ABUSE = 'rate_limit_abuse',
  GEO_BLOCK = 'geo_block',
  NG_WORD_DETECTION = 'ng_word_detection',
  BOT_DETECTION = 'bot_detection',
  MULTIPLE_ACCOUNTS = 'multiple_accounts',
}

export enum NotificationChannel {
  EMAIL = 'email',
  LINE = 'line',
  BOTH = 'both',
  DATABASE = 'database', // デフォルト（DB記録のみ）
}

interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel;
  email?: {
    to: string[];
    from: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
  };
  line?: {
    accessToken: string;
    userIds?: string[]; // 個別通知用
    groupId?: string;   // グループ通知用
  };
  thresholds?: {
    reportCount?: number;        // 報告数閾値（デフォルト: 3）
    rateLimitViolations?: number; // レート制限違反閾値
    ngWordHits?: number;          // NGワード検出数
  };
}

export class NotificationSystem {
  private config: NotificationConfig;

  constructor(config?: NotificationConfig) {
    // 環境変数から設定を読み込み
    this.config = config || {
      enabled: process.env.NOTIFICATION_ENABLED === 'true',
      channels: (process.env.NOTIFICATION_CHANNELS as NotificationChannel) || NotificationChannel.DATABASE,
      email: {
        to: process.env.ADMIN_EMAIL?.split(',') || [],
        from: process.env.EMAIL_FROM || 'noreply@kowareyukujapan.com',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
      },
      line: {
        accessToken: process.env.LINE_NOTIFY_TOKEN || '',
        userIds: process.env.LINE_USER_IDS?.split(','),
        groupId: process.env.LINE_GROUP_ID,
      },
      thresholds: {
        reportCount: parseInt(process.env.REPORT_THRESHOLD || '3'),
        rateLimitViolations: parseInt(process.env.RATE_LIMIT_THRESHOLD || '5'),
        ngWordHits: parseInt(process.env.NG_WORD_THRESHOLD || '3'),
      }
    };
  }

  /**
   * 通知を送信
   */
  async send(
    type: NotificationType,
    title: string,
    message: string,
    details?: Record<string, any>,
    priority?: 'low' | 'normal' | 'high' | 'critical'
  ): Promise<void> {
    if (!this.config.enabled) {
      console.log('Notification system is disabled');
      return;
    }

    // データベースに記録
    await this.saveToDatabase(type, title, message, details, priority);

    // 優先度に基づいて通知チャンネルを決定
    const shouldNotify = priority === 'high' || priority === 'critical';
    
    if (!shouldNotify && priority !== 'critical') {
      return; // 低優先度はDB記録のみ
    }

    // 各チャンネルへの送信
    const channels = this.config.channels;
    
    if (channels === NotificationChannel.EMAIL || channels === NotificationChannel.BOTH) {
      await this.sendEmail(title, message, details, priority);
    }
    
    if (channels === NotificationChannel.LINE || channels === NotificationChannel.BOTH) {
      await this.sendLine(title, message, details, priority);
    }
  }

  /**
   * データベースに通知を記録
   */
  private async saveToDatabase(
    type: NotificationType,
    title: string,
    message: string,
    details?: Record<string, any>,
    priority?: string
  ): Promise<void> {
    try {
      await db.execute({
        sql: `INSERT INTO admin_notifications (
          type, title, message, details, priority, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        args: [type, title, message, JSON.stringify(details || {}), priority || 'normal'],
      });
    } catch (error) {
      console.error('Failed to save notification to database:', error);
    }
  }

  /**
   * メール送信
   */
  private async sendEmail(
    subject: string,
    body: string,
    details?: Record<string, any>,
    priority?: string
  ): Promise<void> {
    const emailConfig = this.config.email;
    
    if (!emailConfig || emailConfig.to.length === 0) {
      console.log('Email notification not configured');
      return;
    }

    try {
      // Node.jsの場合はnodemailerを使用
      if (typeof window === 'undefined') {
        const nodemailer = await import('nodemailer').catch(() => null);
        if (!nodemailer) {
          console.log('Nodemailer not available, using fetch API');
          return this.sendEmailViaAPI(subject, body, details, priority);
        }

        const transporter = nodemailer.createTransport({
          host: emailConfig.smtpHost,
          port: emailConfig.smtpPort,
          secure: emailConfig.smtpPort === 465,
          auth: emailConfig.smtpUser && emailConfig.smtpPass ? {
            user: emailConfig.smtpUser,
            pass: emailConfig.smtpPass,
          } : undefined,
        });

        const priorityMap = {
          critical: '1 (Highest)',
          high: '2 (High)',
          normal: '3 (Normal)',
          low: '4 (Low)',
        };

        const htmlBody = this.formatEmailBody(subject, body, details);

        await transporter.sendMail({
          from: emailConfig.from,
          to: emailConfig.to.join(','),
          subject: `[${priority?.toUpperCase() || 'INFO'}] ${subject}`,
          text: body,
          html: htmlBody,
          priority: priorityMap[priority || 'normal'] as any,
        });
        
        console.log('Email notification sent successfully');
      } else {
        // ブラウザ環境の場合はAPIエンドポイント経由
        await this.sendEmailViaAPI(subject, body, details, priority);
      }
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * API経由でメール送信
   */
  private async sendEmailViaAPI(
    subject: string,
    body: string,
    details?: Record<string, any>,
    priority?: string
  ): Promise<void> {
    try {
      await fetch('/api/admin/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': process.env.NEXT_PUBLIC_ADMIN_KEY || '',
        },
        body: JSON.stringify({
          channel: 'email',
          subject,
          body,
          details,
          priority,
        }),
      });
    } catch (error) {
      console.error('Failed to send email via API:', error);
    }
  }

  /**
   * LINE通知送信
   */
  private async sendLine(
    title: string,
    message: string,
    details?: Record<string, any>,
    priority?: string
  ): Promise<void> {
    const lineConfig = this.config.line;
    
    if (!lineConfig || !lineConfig.accessToken) {
      console.log('LINE notification not configured');
      return;
    }

    try {
      // 優先度に応じたスタンプを選択
      const stickers = {
        critical: { packageId: 11537, stickerId: 52002734 }, // 緊急
        high: { packageId: 11537, stickerId: 52002735 },    // 警告
        normal: { packageId: 11537, stickerId: 52002736 },  // 通知
        low: { packageId: 11537, stickerId: 52002737 },     // 情報
      };

      // メッセージフォーマット
      const formattedMessage = this.formatLineMessage(title, message, details, priority);

      // LINE Notify API呼び出し
      const response = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lineConfig.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          message: formattedMessage,
          ...(priority && stickers[priority] ? {
            stickerPackageId: stickers[priority].packageId.toString(),
            stickerId: stickers[priority].stickerId.toString(),
          } : {}),
        }),
      });

      if (response.ok) {
        console.log('LINE notification sent successfully');
      } else {
        const error = await response.text();
        console.error('LINE notification failed:', error);
      }
    } catch (error) {
      console.error('Failed to send LINE notification:', error);
    }
  }

  /**
   * メール本文のHTML整形
   */
  private formatEmailBody(
    subject: string,
    body: string,
    details?: Record<string, any>
  ): string {
    let html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            ${subject}
          </h2>
          <div style="margin: 20px 0;">
            <p style="color: #555; line-height: 1.6;">
              ${body.replace(/\n/g, '<br>')}
            </p>
          </div>
    `;

    if (details && Object.keys(details).length > 0) {
      html += `
        <div style="background: #f5f5f5; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">詳細情報</h3>
          <table style="width: 100%; border-collapse: collapse;">
      `;

      for (const [key, value] of Object.entries(details)) {
        html += `
          <tr>
            <td style="padding: 5px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">
              ${key}:
            </td>
            <td style="padding: 5px; border-bottom: 1px solid #ddd;">
              ${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            </td>
          </tr>
        `;
      }

      html += `
          </table>
        </div>
      `;
    }

    html += `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px;">
            <p>このメールはKowareyukuJapan管理システムから自動送信されました。</p>
            <p>送信日時: ${new Date().toLocaleString('ja-JP')}</p>
          </div>
        </body>
      </html>
    `;

    return html;
  }

  /**
   * LINEメッセージの整形
   */
  private formatLineMessage(
    title: string,
    message: string,
    details?: Record<string, any>,
    priority?: string
  ): string {
    const priorityEmoji = {
      critical: '🚨',
      high: '⚠️',
      normal: '📢',
      low: 'ℹ️',
    };

    let formatted = `\n${priorityEmoji[priority || 'normal'] || '📌'} ${title}\n`;
    formatted += `━━━━━━━━━━━━━━━━\n`;
    formatted += `${message}\n`;

    if (details && Object.keys(details).length > 0) {
      formatted += `\n【詳細情報】\n`;
      for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'object') {
          formatted += `▸ ${key}: ${JSON.stringify(value)}\n`;
        } else {
          formatted += `▸ ${key}: ${value}\n`;
        }
      }
    }

    formatted += `\n⏰ ${new Date().toLocaleString('ja-JP')}`;

    return formatted;
  }

  /**
   * 報告閾値到達通知
   */
  async notifyReportThreshold(
    postId: string,
    reportCount: number,
    post: any
  ): Promise<void> {
    const priority = reportCount >= 10 ? 'critical' : 'high';
    
    await this.send(
      NotificationType.REPORT_THRESHOLD,
      `投稿が${reportCount}件の報告を受けました`,
      `投稿ID: ${postId}\n` +
      `タイトル: ${post.title || '(無題)'}\n` +
      `投稿者: ${post.handle || '@guest'}\n` +
      `報告数: ${reportCount}件\n` +
      (reportCount >= 10 ? '\n⚠️ 自動非公開処理が実行されました' : '\n要確認: 管理画面でレビューしてください'),
      {
        postId,
        reportCount,
        postTitle: post.title,
        postUrl: post.url,
        autoHidden: reportCount >= 10,
      },
      priority
    );
  }

  /**
   * セキュリティ脅威通知
   */
  async notifySecurityThreat(
    threatType: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.send(
      NotificationType.SECURITY_THREAT,
      `セキュリティ脅威が検出されました: ${threatType}`,
      `脅威タイプ: ${threatType}\n` +
      `検出時刻: ${new Date().toLocaleString('ja-JP')}\n` +
      `詳細: ${JSON.stringify(details, null, 2)}`,
      details,
      'critical'
    );
  }

  /**
   * 定期レポート送信
   */
  async sendDailyReport(): Promise<void> {
    try {
      // 過去24時間の統計を取得
      const stats = await this.getDailyStats();
      
      await this.send(
        NotificationType.ADMIN_ALERT,
        '日次セキュリティレポート',
        `本日のサイト状況をお知らせします。\n\n` +
        `新規投稿数: ${stats.newPosts}\n` +
        `報告件数: ${stats.reports}\n` +
        `ブロック件数: ${stats.blocks}\n` +
        `NGワード検出: ${stats.ngWords}\n` +
        `レート制限違反: ${stats.rateLimits}\n` +
        `地域ブロック: ${stats.geoBlocks}`,
        stats,
        'low'
      );
    } catch (error) {
      console.error('Failed to send daily report:', error);
    }
  }

  /**
   * 日次統計取得
   */
  private async getDailyStats(): Promise<Record<string, number>> {
    const stats = {
      newPosts: 0,
      reports: 0,
      blocks: 0,
      ngWords: 0,
      rateLimits: 0,
      geoBlocks: 0,
    };

    try {
      // 過去24時間の投稿数
      const postsResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM posts 
              WHERE created_at >= datetime('now', '-1 day')`,
        args: [],
      });
      stats.newPosts = postsResult.rows[0]?.count as number || 0;

      // 過去24時間の報告数
      const reportsResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM post_reports 
              WHERE created_at >= datetime('now', '-1 day')`,
        args: [],
      });
      stats.reports = reportsResult.rows[0]?.count as number || 0;

      // 過去24時間の監査ログから統計
      const auditResult = await db.execute({
        sql: `SELECT action, COUNT(*) as count FROM audit_logs 
              WHERE created_at >= datetime('now', '-1 day')
              GROUP BY action`,
        args: [],
      });
      
      for (const row of auditResult.rows) {
        if (row.action === 'USER_BLOCKED' || row.action === 'IP_BLOCKED') {
          stats.blocks += row.count as number;
        } else if (row.action === 'NG_WORD_DETECTED') {
          stats.ngWords = row.count as number;
        } else if (row.action === 'RATE_LIMIT_EXCEEDED') {
          stats.rateLimits = row.count as number;
        }
      }

    } catch (error) {
      console.error('Failed to get daily stats:', error);
    }

    return stats;
  }
}

// シングルトンインスタンス
export const notificationSystem = new NotificationSystem();

export default NotificationSystem;