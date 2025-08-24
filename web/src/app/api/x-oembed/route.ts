import { NextRequest } from "next/server";

// 簡易代理: XのoEmbedエンドポイントは提供されないため、widgets.jsが使えない環境向けに
// ステータスURLを返すだけのフォールバックを提供（将来はサーバ側で取得・静的HTML生成に拡張）

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';

const toTwitter = (u: string) => u.replace(/^https?:\/\/x\.com\//i, 'https://twitter.com/');

// 最小サニタイズ（script/style削除、on*属性削除）
const stripDanger = (s: string) =>
  s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+=( ["'])(?:.(?!\1))*?\1/gi, '');

// blockquoteだけ抽出
const extractBlockquote = (html: string) => {
  const m = html.match(/<blockquote[\s\S]*?<\/blockquote>/i);
  return m ? stripDanger(m[0]) : '';
};

// テキスト化
const textFromBlockquote = (bq: string) =>
  bq
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<br\s*\/?>(?=\s*\n?)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return Response.json({ ok: false, error: 'url is required' }, { status: 400 });

  const tw = toTwitter(url);
  const api = `https://publish.twitter.com/oembed?omit_script=1&hide_thread=1&dnt=1&url=${encodeURIComponent(tw)}`;
  const r = await fetch(api, { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!r.ok) return Response.json({ ok: false, error: `oembed ${r.status}` }, { status: 502 });

  const data = await r.json();
  const bqHtml = extractBlockquote(String(data.html || ''));
  const text = bqHtml ? textFromBlockquote(bqHtml) : null;

  return new Response(
    JSON.stringify({ ok: true, html: bqHtml || null, text, author: data.author_name || null }),
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, s-maxage=${Number(data.cache_age || 86400)}`,
        vary: 'accept-language',
      },
    }
  );
}


