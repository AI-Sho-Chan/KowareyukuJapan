// 地理的IPブロッキングシステム
// 特定国からのアクセスをブロック（VPN検出機能付き）

import { createClient } from '@libsql/client';
import { AuditLogger, AuditAction, AuditSeverity } from './audit-logger';

const db = createClient({
  url: process.env.TURSO_DB_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ブロック対象国
const BLOCKED_COUNTRIES = ['CN', 'KR', 'KP']; // 中国、韓国、北朝鮮
const BLOCKED_COUNTRY_NAMES = {
  'CN': '中国',
  'KR': '韓国', 
  'KP': '北朝鮮',
};

export class GeoBlocker {
  // 既知のVPNプロバイダーのIPレンジ（簡易版）
  private static knownVPNRanges = [
    '104.200.', '104.218.', '104.238.', // Popular VPN providers
    '45.32.', '45.76.', '45.77.', // Vultr (often used for VPN)
    '159.65.', '167.71.', '167.99.', // DigitalOcean
  ];

  // 既知のデータセンターASN（自律システム番号）
  private static datacenterASNs = new Set([
    'AS13335', // Cloudflare
    'AS16509', // Amazon AWS
    'AS15169', // Google
    'AS8075',  // Microsoft Azure
    'AS20473', // Vultr
    'AS14061', // DigitalOcean
  ]);

  /**
   * IPアドレスから国を判定（簡易版）
   * 実運用では GeoIP2 や ipdata.co などのAPIを使用
   */
  static async getCountryFromIP(ip: string): Promise<string | null> {
    // ローカルIPはスキップ
    if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return null;
    }

    // キャッシュチェック
    const cached = await this.getCachedCountry(ip);
    if (cached) return cached;

    try {
      // 無料のIPジオロケーションAPI（制限あり）
      // 実運用では有料APIや自前のGeoIPデータベースを使用
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,proxy,hosting`, {
        signal: AbortSignal.timeout(3000),
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.status === 'success') {
        const country = data.countryCode;
        
        // キャッシュに保存
        await this.cacheCountry(ip, country, data.proxy || data.hosting);
        
        return country;
      }
    } catch (error) {
      console.error('GeoIP lookup failed:', error);
    }
    
    return null;
  }

  /**
   * VPN/プロキシ検出（ヒューリスティック）
   */
  static async detectVPN(ip: string, headers: Headers): Promise<{
    isVPN: boolean;
    confidence: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let confidence = 0;

    // 1. 既知のVPNプロバイダーのIPレンジチェック
    for (const range of this.knownVPNRanges) {
      if (ip.startsWith(range)) {
        reasons.push('Known VPN provider IP range');
        confidence += 40;
        break;
      }
    }

    // 2. HTTPヘッダーの異常検出
    const suspiciousHeaders = [
      'X-Forwarded-For',
      'X-Real-IP', 
      'X-Originating-IP',
      'X-Forwarded-Host',
      'X-ProxyUser-Ip',
      'Client-IP',
    ];

    let headerCount = 0;
    for (const header of suspiciousHeaders) {
      if (headers.get(header)) {
        headerCount++;
      }
    }
    
    if (headerCount >= 3) {
      reasons.push('Multiple proxy headers detected');
      confidence += 30;
    }

    // 3. User-Agentの不審なパターン
    const userAgent = headers.get('User-Agent') || '';
    if (!userAgent || userAgent.length < 20) {
      reasons.push('Missing or suspicious User-Agent');
      confidence += 20;
    }

    // 4. 言語設定の不一致チェック
    const acceptLanguage = headers.get('Accept-Language') || '';
    const country = await this.getCountryFromIP(ip);
    
    if (country && BLOCKED_COUNTRIES.includes(country)) {
      // ブロック対象国からのアクセスなのに日本語設定
      if (acceptLanguage.includes('ja') && !acceptLanguage.startsWith('ja')) {
        reasons.push('Language mismatch for country');
        confidence += 25;
      }
    }

    // 5. 時間帯の異常検出
    const timezone = headers.get('Timezone');
    if (timezone && country) {
      // 国と時間帯の不一致をチェック
      const expectedTimezones: Record<string, string[]> = {
        'CN': ['Asia/Shanghai', 'Asia/Urumqi'],
        'KR': ['Asia/Seoul'],
        'KP': ['Asia/Pyongyang'],
        'JP': ['Asia/Tokyo'],
      };
      
      if (expectedTimezones[country] && !expectedTimezones[country].includes(timezone)) {
        reasons.push('Timezone mismatch for country');
        confidence += 20;
      }
    }

    // 6. DNS逆引きチェック（データセンター検出）
    try {
      const { reverse } = await import('dns/promises');
      const hostnames = await reverse(ip).catch(() => []);
      
      for (const hostname of hostnames) {
        if (hostname.includes('vpn') || hostname.includes('proxy') || 
            hostname.includes('tor') || hostname.includes('relay')) {
          reasons.push('Suspicious hostname in reverse DNS');
          confidence += 35;
          break;
        }
        
        // データセンターのホスト名パターン
        if (hostname.includes('amazonaws') || hostname.includes('googleusercontent') ||
            hostname.includes('digitalocean') || hostname.includes('linode')) {
          reasons.push('Datacenter hostname detected');
          confidence += 25;
        }
      }
    } catch {}

    return {
      isVPN: confidence >= 50,
      confidence: Math.min(confidence, 100),
      reasons,
    };
  }

  /**
   * アクセスをブロックすべきか判定
   */
  static async shouldBlockAccess(ip: string, headers: Headers): Promise<{
    shouldBlock: boolean;
    reason: string;
    country?: string;
    isVPN?: boolean;
  }> {
    // 1. 国別ブロック
    const country = await this.getCountryFromIP(ip);
    if (country && BLOCKED_COUNTRIES.includes(country)) {
      // VPN検出
      const vpnCheck = await this.detectVPN(ip, headers);
      
      // ブロック対象国からの直接アクセス、またはVPN経由
      if (!vpnCheck.isVPN || vpnCheck.confidence > 70) {
        await AuditLogger.log({
          action: AuditAction.IP_BLOCKED,
          severity: AuditSeverity.WARNING,
          ipAddress: ip,
          details: {
            country,
            countryName: BLOCKED_COUNTRY_NAMES[country as keyof typeof BLOCKED_COUNTRY_NAMES],
            vpnDetected: vpnCheck.isVPN,
            vpnConfidence: vpnCheck.confidence,
            vpnReasons: vpnCheck.reasons,
          },
        });
        
        return {
          shouldBlock: true,
          reason: `アクセスが制限されています (${BLOCKED_COUNTRY_NAMES[country as keyof typeof BLOCKED_COUNTRY_NAMES]})`,
          country,
          isVPN: vpnCheck.isVPN,
        };
      }
    }

    // 2. VPN経由で日本からアクセスしている疑いがある場合
    const vpnCheck = await this.detectVPN(ip, headers);
    if (vpnCheck.confidence >= 80) {
      // 高確度でVPN/プロキシを使用
      await AuditLogger.log({
        action: AuditAction.SUSPICIOUS_ACTIVITY,
        severity: AuditSeverity.WARNING,
        ipAddress: ip,
        details: {
          reason: 'High confidence VPN/Proxy detected',
          confidence: vpnCheck.confidence,
          vpnReasons: vpnCheck.reasons,
        },
      });
      
      // 一時的に監視モード（ブロックはしない）
      // return {
      //   shouldBlock: true,
      //   reason: 'VPN/プロキシ経由のアクセスは制限されています',
      //   isVPN: true,
      // };
    }

    return {
      shouldBlock: false,
      reason: '',
    };
  }

  /**
   * キャッシュから国情報を取得
   */
  private static async getCachedCountry(ip: string): Promise<string | null> {
    try {
      const result = await db.execute({
        sql: `
          SELECT country_code 
          FROM ip_geo_cache 
          WHERE ip = ? 
            AND created_at > datetime('now', '-7 days')
        `,
        args: [ip],
      });
      
      if (result.rows.length > 0) {
        return (result.rows[0] as any).country_code;
      }
    } catch {
      // テーブルがない場合は作成
      await db.execute(`
        CREATE TABLE IF NOT EXISTS ip_geo_cache (
          ip TEXT PRIMARY KEY,
          country_code TEXT,
          is_vpn BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).catch(() => {});
    }
    
    return null;
  }

  /**
   * 国情報をキャッシュに保存
   */
  private static async cacheCountry(ip: string, country: string, isVPN: boolean): Promise<void> {
    try {
      await db.execute({
        sql: `
          INSERT OR REPLACE INTO ip_geo_cache (ip, country_code, is_vpn, created_at)
          VALUES (?, ?, ?, datetime('now'))
        `,
        args: [ip, country, isVPN ? 1 : 0],
      });
    } catch {}
  }

  /**
   * IPレピュテーションチェック
   */
  static async checkIPReputation(ip: string): Promise<{
    reputation: 'good' | 'suspicious' | 'bad';
    score: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let score = 100; // 100が最良、0が最悪

    // 過去の違反履歴をチェック
    try {
      const violations = await db.execute({
        sql: `
          SELECT COUNT(*) as violation_count,
                 SUM(CASE WHEN action = 'POST_BLOCK' THEN 1 ELSE 0 END) as blocked_posts,
                 SUM(CASE WHEN action = 'RATE_LIMIT_EXCEEDED' THEN 1 ELSE 0 END) as rate_limits,
                 SUM(CASE WHEN action = 'NG_WORD_DETECTED' THEN 1 ELSE 0 END) as ng_words
          FROM audit_logs
          WHERE ip_address = ?
            AND created_at > datetime('now', '-30 days')
            AND severity IN ('WARNING', 'ERROR', 'CRITICAL')
        `,
        args: [ip],
      });
      
      if (violations.rows.length > 0) {
        const stats = violations.rows[0] as any;
        
        if (stats.violation_count > 0) {
          score -= Math.min(stats.violation_count * 5, 50);
          
          if (stats.blocked_posts > 0) {
            reasons.push(`Blocked posts: ${stats.blocked_posts}`);
            score -= stats.blocked_posts * 10;
          }
          
          if (stats.rate_limits > 5) {
            reasons.push(`Rate limit violations: ${stats.rate_limits}`);
            score -= stats.rate_limits * 2;
          }
          
          if (stats.ng_words > 0) {
            reasons.push(`NG word detections: ${stats.ng_words}`);
            score -= stats.ng_words * 5;
          }
        }
      }
    } catch {}

    // スコアの正規化
    score = Math.max(0, Math.min(100, score));

    return {
      reputation: score >= 70 ? 'good' : score >= 30 ? 'suspicious' : 'bad',
      score,
      reasons,
    };
  }
}

export default GeoBlocker;