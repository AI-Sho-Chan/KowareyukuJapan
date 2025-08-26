import dns from 'node:dns/promises';
import net from 'node:net';

// SSRFガード設定
export const SSRF_CONFIG = {
  MAX_RESPONSE_SIZE: 5 * 1024 * 1024, // 5MB
  DEFAULT_TIMEOUT: 5000, // 5秒
  MAX_TIMEOUT: 8000, // 8秒
  MAX_REDIRECTS: 3,
  ALLOWED_PORTS: [80, 443],
};

const PRIVATE_CIDRS = [
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
  '127.0.0.0/8', '0.0.0.0/8', '169.254.0.0/16',
  // metadata/common
  '100.64.0.0/10',
];

// IPv6 private/special ranges
const PRIVATE_CIDRS6 = [
  '::1/128',        // loopback
  '::/128',         // unspecified
  'fc00::/7',       // unique local
  'fe80::/10',      // link-local
  'fec0::/10',      // site-local (deprecated)
  'ff00::/8',       // multicast
  '2001:db8::/32',  // documentation
  '::ffff:0:0/96',  // IPv4-mapped IPv6
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const maskBits = Number(bitsStr);
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

// IPv6 helpers
function expandIPv6(address: string): string {
  const parts = address.split('::');
  if (parts.length > 2) return address;
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts[1] ? parts[1].split(':') : [];
  const fill = new Array(8 - (head.length + tail.length)).fill('0');
  const full = [...head, ...fill, ...tail].map(h => h.padStart(4, '0'));
  return full.join(':');
}

function ipv6ToBigInt(address: string): bigint {
  const full = expandIPv6(address.toLowerCase());
  return full.split(':').reduce((acc, h) => (acc << 16n) + BigInt(parseInt(h, 16)), 0n);
}

function inCidr6(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const ipInt = ipv6ToBigInt(ip);
  const rangeInt = ipv6ToBigInt(range);
  const mask = bits === 0 ? 0n : (~0n << BigInt(128 - bits)) & ((1n << 128n) - 1n);
  return (ipInt & mask) === (rangeInt & mask);
}

export type SafeUrl = {
  href: string;
  host: string;
};

export async function validateOutboundUrl(raw: string, opts?: { allowHttp?: boolean }): Promise<SafeUrl> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error('invalid_url'); }
  const protocol = u.protocol.toLowerCase();
  if (protocol !== 'https:' && !(opts?.allowHttp && protocol === 'http:')) throw new Error('invalid_protocol');
  if (u.username || u.password) throw new Error('auth_in_url');
  if (u.port && !/^\d+$/.test(u.port)) throw new Error('invalid_port');
  
  // ポート制限（80, 443のみ許可）
  const port = u.port ? parseInt(u.port) : (protocol === 'https:' ? 443 : 80);
  if (!SSRF_CONFIG.ALLOWED_PORTS.includes(port)) {
    throw new Error(`invalid_port: ${port} not allowed`);
  }

  const host = u.hostname;
  // DNS解決→私有/メタIP遮断（IPv4/IPv6）
  const rec = await dns.lookup(host, { all: true }).catch(() => { throw new Error('dns_error'); });
  if (!rec || rec.length === 0) throw new Error('no_address');
  let hasGlobal = false;
  for (const entry of rec) {
    const ip = entry.address;
    const family = entry.family || net.isIP(ip);
    if (family === 4 || family === 0) {
      if (PRIVATE_CIDRS.some(c => inCidr(ip, c))) continue; else hasGlobal = true;
    } else if (family === 6) {
      const isGlobalRange = inCidr6(ip, '2000::/3');
      const isPrivate6 = PRIVATE_CIDRS6.some(c => inCidr6(ip, c));
      if (isGlobalRange && !isPrivate6) hasGlobal = true;
    }
  }
  if (!hasGlobal) throw new Error('no_global_address');
  return { href: u.href, host };
}

export async function fetchUrlWithSsrfGuard(raw: string, init: RequestInit & { timeoutMs?: number, allowHttp?: boolean, maxSize?: number } = {}): Promise<Response> {
  const { 
    timeoutMs = SSRF_CONFIG.DEFAULT_TIMEOUT, 
    allowHttp = false, 
    maxSize = SSRF_CONFIG.MAX_RESPONSE_SIZE,
    headers, 
    method 
  } = init as any;
  
  // タイムアウトの上限チェック
  const safeTimeout = Math.min(timeoutMs, SSRF_CONFIG.MAX_TIMEOUT);
  let currentUrl = (await validateOutboundUrl(raw, { allowHttp })).href;
  let hop = 0;
  const maxHops = SSRF_CONFIG.MAX_REDIRECTS;
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), safeTimeout);
  try {
    while (true) {
      const h = new Headers(headers || {});
      const m = (method || 'GET').toUpperCase();
      
      // レスポンスサイズ制限のためのRangeヘッダー
      if (m === 'GET' && !h.has('Range') && maxSize) {
        h.set('Range', `bytes=0-${maxSize - 1}`);
      }
      
      const resp = await fetch(currentUrl, { ...init, redirect: 'manual', signal: ac.signal, headers: h });
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location');
        if (!loc) return resp;
        const nextUrl = new URL(loc, currentUrl).toString();
        currentUrl = (await validateOutboundUrl(nextUrl, { allowHttp })).href;
        hop += 1; if (hop > maxHops) throw new Error('redirect_loop');
        continue;
      }
      return resp;
    }
  } finally { clearTimeout(to); }
}


