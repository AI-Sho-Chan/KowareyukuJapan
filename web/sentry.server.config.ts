import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // サンプリングレート
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // 環境
    environment: process.env.NODE_ENV || 'development',
    
    // PII除去
    beforeSend(event, hint) {
      // 個人情報の除去
      if (event.request) {
        // IPアドレス除去
        delete event.request.env?.REMOTE_ADDR;
        delete event.user?.ip_address;
        
        // ヘッダーからトークン除去
        if (event.request.headers) {
          const headers = event.request.headers as any;
          if (headers.authorization) headers.authorization = '[REDACTED]';
          if (headers['x-api-key']) headers['x-api-key'] = '[REDACTED]';
        }
        
        // データベースURL除去
        if (event.extra?.DATABASE_URL) {
          event.extra.DATABASE_URL = '[REDACTED]';
        }
      }
      
      return event;
    },
    
    // 無視するエラー
    ignoreErrors: [
      'SQLITE_BUSY',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ],
  });
}