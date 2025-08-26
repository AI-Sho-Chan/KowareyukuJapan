// セキュリティモジュールの統合エクスポート

export { NGWordFilter } from './ngword-filter';
export { NGWordFilterV2 } from './ngword-filter-v2';
export { RateLimiter, getRateLimitHeaders } from './rate-limiter';
export { AuditLogger, AuditAction, AuditSeverity } from './audit-logger';
export { ReportSystem, ReportReason, ReportStatus, ReportAction, isBlocked } from './report-system';
export { GeoBlocker } from './geo-blocker';
export { AdvancedProtection } from './advanced-protection';
export { NotificationSystem, NotificationType, NotificationChannel, notificationSystem } from './notification-system';

// ユーティリティ関数
export function getClientIP(request: Request): string {
  // Cloudflare
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) return cfIP;
  
  // X-Forwarded-For
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  // X-Real-IP
  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) return xRealIP;
  
  // デフォルト
  return '127.0.0.1';
}

export function getUserAgent(request: Request): string {
  return request.headers.get('User-Agent') || 'unknown';
}