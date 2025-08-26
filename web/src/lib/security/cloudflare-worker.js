// Cloudflare Worker - エッジレベルのセキュリティフィルタリング
// このコードはCloudflare Workerとしてデプロイされます

// 設定
const CONFIG = {
  // ブロック対象国
  BLOCKED_COUNTRIES: ['CN', 'KR', 'KP'],
  
  // レート制限設定
  RATE_LIMITS: {
    // IPごとの制限
    IP: {
      requests: 100,        // リクエスト数
      window: 60,          // 秒単位のウィンドウ
      blockDuration: 1800, // ブロック期間（秒）
    },
    // POSTリクエストの制限
    POST: {
      requests: 3,
      window: 300,
      blockDuration: 1800,
    },
  },
  
  // VPN/プロキシ検出
  VPN_DETECTION: true,
  
  // 疑わしいヘッダーパターン
  SUSPICIOUS_HEADERS: [
    'X-Forwarded-Host',
    'X-Originating-IP',
    'X-Remote-IP',
    'X-Remote-Addr',
  ],
  
  // ブロックするユーザーエージェント
  BLOCKED_USER_AGENTS: [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java(?!script)/i,
    /perl/i,
    /ruby/i,
    /go-http-client/i,
  ],
  
  // 簡易NGワードリスト（エッジレベル）
  NG_WORDS: [
    // サイト攻撃
    'kowareyukujapan',
    'こわれゆくジャパン',
    'クソサイト',
    'ゴミサイト',
    // 暴力的表現
    '死ね',
    '殺す',
    // 反日
    'ジャップ',
    'JAP',
    '天皇死',
    'ネトウヨ',
  ],
};

// KVネームスペース（Cloudflare KVで設定）
// const RATE_LIMIT_KV = RATE_LIMIT;
// const BLOCKED_IPS_KV = BLOCKED_IPS;
// const SECURITY_LOGS_KV = SECURITY_LOGS;

/**
 * メインハンドラー
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * リクエスト処理
 */
async function handleRequest(request) {
  const cf = request.cf;
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const country = cf?.country || 'XX';
  const userAgent = request.headers.get('User-Agent') || '';
  const method = request.method;
  const url = new URL(request.url);
  
  // セキュリティチェックの結果
  const securityCheck = {
    blocked: false,
    reason: null,
    score: 0,
  };
  
  // 1. 地域ブロック
  if (CONFIG.BLOCKED_COUNTRIES.includes(country)) {
    securityCheck.blocked = true;
    securityCheck.reason = `Access from ${country} is not allowed`;
    securityCheck.score += 100;
    
    await logSecurity('GEO_BLOCK', ip, { country });
    return createBlockResponse(securityCheck.reason, 403);
  }
  
  // 2. VPN/プロキシ検出
  if (CONFIG.VPN_DETECTION) {
    const isVPN = await detectVPN(request, cf);
    if (isVPN) {
      securityCheck.score += 50;
      await logSecurity('VPN_DETECTED', ip, { headers: Object.fromEntries(request.headers) });
      
      // VPNからのPOSTは即ブロック
      if (method === 'POST') {
        securityCheck.blocked = true;
        securityCheck.reason = 'VPN/Proxy connections are not allowed for posting';
        return createBlockResponse(securityCheck.reason, 403);
      }
    }
  }
  
  // 3. ユーザーエージェントチェック
  const isSuspiciousUA = CONFIG.BLOCKED_USER_AGENTS.some(pattern => pattern.test(userAgent));
  if (isSuspiciousUA) {
    securityCheck.score += 30;
    await logSecurity('SUSPICIOUS_UA', ip, { userAgent });
    
    if (method === 'POST') {
      securityCheck.blocked = true;
      securityCheck.reason = 'Automated requests are not allowed';
      return createBlockResponse(securityCheck.reason, 403);
    }
  }
  
  // 4. レート制限チェック
  const rateLimitKey = `${ip}:${method}`;
  const isRateLimited = await checkRateLimit(rateLimitKey, method);
  if (isRateLimited) {
    securityCheck.blocked = true;
    securityCheck.reason = 'Rate limit exceeded. Please try again later';
    await logSecurity('RATE_LIMIT', ip, { method, key: rateLimitKey });
    return createBlockResponse(securityCheck.reason, 429);
  }
  
  // 5. POSTリクエストの追加チェック（NGワードのみ。言語ブロックは無効化）
  if (method === 'POST') {
    const contentType = request.headers.get('Content-Type') || '';
    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      try {
        const body = await request.clone().text();
        const hasNGWord = checkNGWords(body);
        if (hasNGWord) {
          securityCheck.blocked = true;
          securityCheck.reason = 'Content contains prohibited words';
          await logSecurity('NG_WORD', ip, { detected: hasNGWord });
          return createBlockResponse(securityCheck.reason, 400);
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }
  
  // 6. セキュリティスコアによる判定
  if (securityCheck.score >= 80) {
    securityCheck.blocked = true;
    securityCheck.reason = 'Security check failed';
    await logSecurity('HIGH_RISK', ip, { score: securityCheck.score });
    return createBlockResponse(securityCheck.reason, 403);
  }
  
  // 7. セキュリティヘッダーを追加してプロキシ
  const response = await fetch(request);
  const newResponse = new Response(response.body, response);
  
  // セキュリティヘッダー追加
  newResponse.headers.set('X-Security-Score', securityCheck.score.toString());
  newResponse.headers.set('X-Client-IP', ip);
  newResponse.headers.set('X-Client-Country', country);
  newResponse.headers.set('X-Frame-Options', 'DENY');
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-XSS-Protection', '1; mode=block');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSPヘッダー（必要に応じて調整）
  newResponse.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://platform.twitter.com https://www.tiktok.com https://connect.facebook.net; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "frame-src 'self' https://platform.twitter.com https://www.tiktok.com https://www.threads.net https://www.nicovideo.jp https://note.com; " +
    "connect-src 'self';"
  );
  
  return newResponse;
}

/**
 * VPN/プロキシ検出
 */
async function detectVPN(request, cf) {
  // Cloudflareの脅威スコア
  if (cf?.threatScore && cf.threatScore > 30) {
    return true;
  }
  
  // 疑わしいヘッダーの検出
  for (const header of CONFIG.SUSPICIOUS_HEADERS) {
    if (request.headers.get(header)) {
      return true;
    }
  }
  
  // ASN（自律システム番号）チェック
  const vpnASNs = [
    13335, // Cloudflare (一部VPN)
    14061, // DigitalOcean
    16509, // Amazon AWS
    15169, // Google
    8075,  // Microsoft Azure
    20473, // Choopa (Vultr)
    14618, // Amazon AWSもう一つ
  ];
  
  if (cf?.asn && vpnASNs.includes(cf.asn)) {
    return true;
  }
  
  // Tor出口ノードチェック（簡易版）
  const torExitNodes = cf?.isEUCountry === false && cf?.timezone === 'UTC';
  if (torExitNodes) {
    return true;
  }
  
  return false;
}

/**
 * レート制限チェック
 */
async function checkRateLimit(key, method) {
  const limits = method === 'POST' ? CONFIG.RATE_LIMITS.POST : CONFIG.RATE_LIMITS.IP;
  
  // Cloudflare KVを使用（本番環境）
  // const current = await RATE_LIMIT_KV.get(key, { type: 'json' }) || { count: 0, timestamp: Date.now() };
  
  // デモ用：インメモリ実装
  // 実際にはCloudflare KVを使用する
  const demoRateLimit = {
    check: (key) => {
      // 簡易実装
      return false;
    }
  };
  
  return demoRateLimit.check(key);
}

/**
 * NGワードチェック（簡易版）
 */
function checkNGWords(text) {
  const normalizedText = text.toLowerCase();
  for (const word of CONFIG.NG_WORDS) {
    if (normalizedText.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

/**
 * 中国語・韓国語検出
 */
function containsChineseOrKorean(text) {
  // Deprecated: no-op to avoid discriminatory blocks
  return false;
}

/**
 * ブロックレスポンス生成
 */
function createBlockResponse(message, status = 403) {
  return new Response(JSON.stringify({
    error: message,
    timestamp: new Date().toISOString(),
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * セキュリティログ記録
 */
async function logSecurity(type, ip, details) {
  const log = {
    type,
    ip,
    timestamp: Date.now(),
    details,
  };
  
  // Cloudflare KVに記録（本番環境）
  // await SECURITY_LOGS_KV.put(`${type}:${ip}:${Date.now()}`, JSON.stringify(log), {
  //   expirationTtl: 86400 * 7, // 7日間保持
  // });
  
  // Analytics Engineに送信（本番環境）
  // logToAnalytics(log);
  
  console.log('Security Log:', log);
}

/**
 * Cloudflare Analytics Engineへのログ送信
 */
function logToAnalytics(log) {
  // Cloudflare Analytics Engine統合
  // navigator.sendBeacon('/api/analytics', JSON.stringify(log));
}