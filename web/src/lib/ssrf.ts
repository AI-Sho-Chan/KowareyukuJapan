import dns from 'node:dns/promises';
import net from 'node:net';

const PRIVATE_CIDRS = [
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
  '127.0.0.0/8', '0.0.0.0/8', '169.254.0.0/16',
  // metadata/common
  '100.64.0.0/10',
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

  const host = u.hostname;
  // DNS解決→私有/メタIP遮断
  const rec = await dns.lookup(host, { all: true }).catch(() => { throw new Error('dns_error'); });
  const addrs = rec.map(r => r.address).filter(a => net.isIP(a) === 4);
  if (addrs.length === 0) throw new Error('no_ipv4');
  for (const ip of addrs) {
    if (PRIVATE_CIDRS.some(c => inCidr(ip, c))) throw new Error('private_ip');
  }
  return { href: u.href, host };
}


