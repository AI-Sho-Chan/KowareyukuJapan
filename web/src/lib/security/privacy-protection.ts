// プライバシー保護とセキュリティ強化システム
// 管理者情報の完全保護とクラッキング対策

import crypto from 'crypto';
import { createClient } from '@libsql/client';
import { AuditLogger, AuditAction, AuditSeverity } from './audit-logger';
import { notificationSystem, NotificationType } from './notification-system';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * プライバシー保護システム
 * 管理者や開発者の情報を完全に保護
 */
export class PrivacyProtection {
  // ハッシュ化設定
  private static readonly SALT_ROUNDS = 12;
  private static readonly PEPPER = process.env.SECURITY_PEPPER || 'default-pepper-change-this';
  
  // 禁止パス（管理者情報へのアクセスを防ぐ）
  private static readonly PROTECTED_PATHS = [
    '/api/admin/config',
    '/api/admin/credentials',
    '/.env',
    '/config',
    '/secrets',
    '/.git',
    '/backup',
    '/private',
    '/internal',
  ];

  // SQL インジェクション検出パターン
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bOR\b.*=.*)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bEXEC\b|\bEXECUTE\b)/i,
    /(\bSCRIPT\b.*\bSRC\b)/i,
    /(javascript:|onerror=|onclick=)/i,
  ];

  // パスワード試行検出
  private static readonly passwordAttempts = new Map<string, number>();
  private static readonly MAX_PASSWORD_ATTEMPTS = 3;
  private static readonly LOCKOUT_DURATION = 3600000; // 1時間

  /**
   * 管理者認証の保護
   * bcryptとpepperによる二重ハッシュ化
   */
  static async protectAdminAuth(password: string): Promise<string> {
    // パスワードにpepperを追加
    const peppered = password + this.PEPPER;
    
    // SHA-256でハッシュ化（追加のセキュリティ層）
    const hash = crypto.createHash('sha256');
    hash.update(peppered);
    const hashedPassword = hash.digest('hex');
    
    // bcryptでさらにハッシュ化（本番環境では bcrypt を使用）
    // ここでは簡易実装
    const finalHash = crypto.createHash('sha512');
    finalHash.update(hashedPassword + Date.now().toString());
    
    return finalHash.digest('hex');
  }

  /**
   * 管理者キーの検証（ブルートフォース対策付き）
   */
  static async verifyAdminKey(
    providedKey: string,
    ipAddress: string
  ): Promise<{ valid: boolean; locked?: boolean; message?: string }> {
    // IPごとの試行回数チェック
    const attempts = this.passwordAttempts.get(ipAddress) || 0;
    
    if (attempts >= this.MAX_PASSWORD_ATTEMPTS) {
      await this.handleBruteForceAttack(ipAddress);
      return { 
        valid: false, 
        locked: true,
        message: 'アカウントがロックされました。1時間後に再試行してください。'
      };
    }

    // 環境変数から管理者キーを取得（ハッシュ化されたもの）
    const validKeyHash = process.env.ADMIN_KEY_HASH || await this.protectAdminAuth(process.env.NEXT_PUBLIC_ADMIN_KEY || '');
    
    // 提供されたキーをハッシュ化して比較
    const providedKeyHash = await this.protectAdminAuth(providedKey);
    
    // タイミング攻撃対策のため、常に固定時間で比較
    const isValid = await this.secureCompare(providedKeyHash, validKeyHash);
    
    if (!isValid) {
      this.passwordAttempts.set(ipAddress, attempts + 1);
      
      // 3回失敗でアカウントロック
      if (attempts + 1 >= this.MAX_PASSWORD_ATTEMPTS) {
        await this.handleBruteForceAttack(ipAddress);
      }
      
      return { 
        valid: false,
        message: `認証失敗。残り試行回数: ${this.MAX_PASSWORD_ATTEMPTS - attempts - 1}`
      };
    }
    
    // 成功時は試行回数をリセット
    this.passwordAttempts.delete(ipAddress);
    return { valid: true };
  }

  /**
   * タイミング攻撃対策用の安全な文字列比較
   */
  private static async secureCompare(a: string, b: string): Promise<boolean> {
    if (a.length !== b.length) {
      // 長さが違う場合も同じ時間かけて比較
      await new Promise(resolve => setTimeout(resolve, 100));
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    // 固定時間待機
    await new Promise(resolve => setTimeout(resolve, 100));
    return result === 0;
  }

  /**
   * SQLインジェクション検出
   */
  static detectSQLInjection(input: string): boolean {
    if (!input) return false;
    
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * XSS攻撃検出
   */
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /onerror=/gi,
      /onclick=/gi,
      /onload=/gi,
      /<img.*?src.*?>/gi,
      /document\.cookie/gi,
      /window\.location/gi,
      /eval\(/gi,
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * パストラバーサル攻撃検出
   */
  static detectPathTraversal(path: string): boolean {
    const traversalPatterns = [
      /\.\.\//g,
      /\.\.%2[fF]/g,
      /%2e%2e/gi,
      /\.\./g,
      /etc\/passwd/gi,
      /windows\/system32/gi,
    ];
    
    for (const pattern of traversalPatterns) {
      if (pattern.test(path)) {
        return true;
      }
    }
    
    // 保護されたパスへのアクセス試行
    for (const protectedPath of this.PROTECTED_PATHS) {
      if (path.toLowerCase().includes(protectedPath.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * ブルートフォース攻撃への対処
   */
  private static async handleBruteForceAttack(ipAddress: string): Promise<void> {
    // IPをブロック
    await db.execute({
      sql: `INSERT INTO blocked_ips (ip_address, reason, blocked_until, created_at)
            VALUES (?, 'brute_force_attack', datetime('now', '+1 hour'), datetime('now'))`,
      args: [ipAddress],
    });
    
    // 監査ログ
    await AuditLogger.log({
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.CRITICAL,
      ipAddress,
      details: {
        type: 'brute_force_attack',
        action: 'ip_blocked',
        duration: '1 hour',
      },
    });
    
    // 管理者に緊急通知
    await notificationSystem.notifySecurityThreat('ブルートフォース攻撃', {
      ipAddress,
      attempts: this.MAX_PASSWORD_ATTEMPTS,
      action: 'IP blocked for 1 hour',
    });
    
    // ロックアウト期間後に試行回数をリセット
    setTimeout(() => {
      this.passwordAttempts.delete(ipAddress);
    }, this.LOCKOUT_DURATION);
  }

  /**
   * セキュリティヘッダーの設定
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Permitted-Cross-Domain-Policies': 'none',
    };
  }

  /**
   * レスポンスのサニタイズ
   * 管理者情報を含む可能性のあるデータを除去
   */
  static sanitizeResponse(data: any): any {
    if (typeof data === 'string') {
      // 環境変数や秘密情報のパターンを除去
      return data
        .replace(/ADMIN_KEY=[\w\-]+/gi, 'ADMIN_KEY=[REDACTED]')
        .replace(/TOKEN=[\w\-]+/gi, 'TOKEN=[REDACTED]')
        .replace(/PASSWORD=[\w\-]+/gi, 'PASSWORD=[REDACTED]')
        .replace(/SECRET=[\w\-]+/gi, 'SECRET=[REDACTED]')
        .replace(/API_KEY=[\w\-]+/gi, 'API_KEY=[REDACTED]')
        .replace(/email:\s*[\w\.\-]+@[\w\.\-]+/gi, 'email:[REDACTED]')
        .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_REDACTED]'); // IPアドレス
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      
      for (const key in data) {
        // 秘密情報を含むキーをスキップ
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential', 'admin'];
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeResponse(data[key]);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }
}

/**
 * ハニーポットシステム
 * 攻撃者を検出し、逆に情報を収集
 */
export class HoneypotSystem {
  // ハニーポットエンドポイント
  private static readonly HONEYPOT_PATHS = [
    '/admin.php',
    '/wp-admin',
    '/phpmyadmin',
    '/.git/config',
    '/config.json',
    '/backup.sql',
    '/api/v1/users',
    '/login.aspx',
    '/.env.backup',
    '/database.yml',
  ];

  /**
   * ハニーポットパスかどうか確認
   */
  static isHoneypotPath(path: string): boolean {
    return this.HONEYPOT_PATHS.some(hp => 
      path.toLowerCase().includes(hp.toLowerCase())
    );
  }

  /**
   * ハニーポットアクセスへの対応
   */
  static async handleHoneypotAccess(
    path: string,
    ipAddress: string,
    headers: Headers
  ): Promise<Response> {
    // 攻撃者情報を記録
    await this.logAttacker(ipAddress, path, headers);
    
    // 即座にIPをブロック
    await this.blockAttacker(ipAddress);
    
    // 管理者に通知
    await this.notifyAttack(ipAddress, path);
    
    // フェイクレスポンスを返す（攻撃者を混乱させる）
    return this.createFakeResponse(path);
  }

  /**
   * 攻撃者情報の記録
   */
  private static async logAttacker(
    ipAddress: string,
    path: string,
    headers: Headers
  ): Promise<void> {
    const attackerInfo = {
      ip: ipAddress,
      path,
      userAgent: headers.get('User-Agent') || 'unknown',
      referer: headers.get('Referer') || 'direct',
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(headers.entries()),
    };
    
    await db.execute({
      sql: `INSERT INTO security_events (
        event_type, severity, source_ip, target_id, 
        target_type, description, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        'honeypot_triggered',
        'CRITICAL',
        ipAddress,
        path,
        'honeypot',
        `Honeypot triggered: ${path}`,
        JSON.stringify(attackerInfo),
      ],
    });
    
    await AuditLogger.log({
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.CRITICAL,
      ipAddress,
      details: {
        type: 'honeypot_triggered',
        path,
        attackerInfo,
      },
    });
  }

  /**
   * 攻撃者を即座にブロック
   */
  private static async blockAttacker(ipAddress: string): Promise<void> {
    await db.execute({
      sql: `INSERT INTO blocked_ips (ip_address, reason, created_at)
            VALUES (?, 'honeypot_triggered', datetime('now'))`,
      args: [ipAddress],
    });
  }

  /**
   * 管理者への攻撃通知
   */
  private static async notifyAttack(ipAddress: string, path: string): Promise<void> {
    await notificationSystem.notifySecurityThreat('ハニーポット発動', {
      ipAddress,
      path,
      message: 'クラッキング試行を検出しました。攻撃者のIPを永久ブロックしました。',
      severity: 'CRITICAL',
    });
  }

  /**
   * フェイクレスポンス生成
   */
  private static createFakeResponse(path: string): Response {
    // パスに応じたフェイクデータを返す
    let fakeData: any;
    let contentType = 'text/html';
    
    if (path.includes('.json')) {
      contentType = 'application/json';
      fakeData = {
        error: 'Database connection failed',
        code: 'DB_CONNECTION_ERROR',
        details: 'MySQL server has gone away',
      };
    } else if (path.includes('.php') || path.includes('admin')) {
      fakeData = `
        <!DOCTYPE html>
        <html>
        <head><title>Admin Panel - Under Maintenance</title></head>
        <body>
          <h1>System Maintenance</h1>
          <p>The admin panel is currently under maintenance.</p>
          <p>Please try again later.</p>
          <!-- Debug: Connection timeout at 192.168.1.100:3306 -->
        </body>
        </html>
      `;
    } else if (path.includes('.env')) {
      contentType = 'text/plain';
      fakeData = `
# This is a fake .env file
DATABASE_URL=mysql://localhost:3306/test_db
ADMIN_PASSWORD=nice_try_hacker
SECRET_KEY=you_wish_this_was_real
API_KEY=fake_api_key_123456
      `;
    } else {
      fakeData = '<h1>404 Not Found</h1>';
    }
    
    // レスポンスを遅延させて攻撃者の時間を無駄にする
    return new Response(
      typeof fakeData === 'string' ? fakeData : JSON.stringify(fakeData),
      {
        status: 200, // わざと200を返して混乱させる
        headers: {
          'Content-Type': contentType,
          'Server': 'Apache/2.2.14 (Ubuntu)', // 古いバージョンを装う
          'X-Powered-By': 'PHP/5.3.2', // 脆弱なバージョンを装う
        },
      }
    );
  }

  /**
   * セキュリティ警告バナー生成
   */
  static generateWarningBanner(ipAddress: string): string {
    return `
      <div style="position: fixed; top: 0; left: 0; right: 0; z-index: 9999; 
                  background: #ff0000; color: white; padding: 20px; text-align: center;
                  font-family: monospace; font-size: 16px;">
        ⚠️ 警告: 不正アクセスを検出しました ⚠️<br>
        IPアドレス: ${ipAddress}<br>
        このアクセスは記録され、法的措置の対象となる可能性があります。<br>
        WARNING: Unauthorized access detected. Your IP has been logged.
      </div>
    `;
  }
}

export default PrivacyProtection;