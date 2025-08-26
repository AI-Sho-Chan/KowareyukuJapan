import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // サンプリングレート
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // セッション追跡
    autoSessionTracking: true,
    
    // エラー再生
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    
    // 環境
    environment: process.env.NODE_ENV || 'development',
    
    // PII除去
    beforeSend(event, hint) {
      // 個人情報の除去
      if (event.request) {
        // IPアドレス除去
        delete event.request.env?.REMOTE_ADDR;
        delete event.user?.ip_address;
        
        // メールアドレス/パスワードの除去
        if (event.request.data) {
          const data = event.request.data as any;
          if (data.email) data.email = '[REDACTED]';
          if (data.password) data.password = '[REDACTED]';
        }
      }
      
      return event;
    },
    
    // 無視するエラー
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      /^Failed to fetch/,
    ],
    
    // 統合設定
    integrations: [
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
  });
}