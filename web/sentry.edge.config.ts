import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // サンプリングレート（Edgeは低めに）
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    
    // 環境
    environment: process.env.NODE_ENV || 'development',
    
    // PII除去
    beforeSend(event, hint) {
      // 個人情報の除去
      if (event.request) {
        delete event.user?.ip_address;
        
        // クッキーの除去
        if (event.request.cookies) {
          event.request.cookies = '[REDACTED]';
        }
      }
      
      return event;
    },
  });
}