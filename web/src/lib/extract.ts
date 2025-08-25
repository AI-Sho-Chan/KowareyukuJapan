export const norm = (s = '') => s.toLowerCase()
  .replace(/\s+/g,' ').replace(/[|｜\-–—:：。「」『』【】（）()\[\]"]/g,'').trim();

const BAN = [
  /^(yahoo!?(ニュース)?|ヤフー)\b/i,
  /^(ヘルプ|ログイン|会員|マイページ|設定|利用規約|プライバシー)/,
  /(ランキング|クーポン|セール|広告|pr|スポンサー|キャンペーン)/i,
  /(コメント|シェア|ツイート|line|はてな|sns)/i,
  /(画像|写真|出典|提供|関連記事|こちら|参照|リンク)/,
  /(本日|5のつく日|idでもっと便利に|新規取得|トップ)/i,
  /%[0-9a-f]{2}/i
];

function splitSentences(t: string){
  return t
    .replace(/\r/g,'')
    .replace(/!\s*/g,'！').replace(/\?\s*/g,'？')
    .replace(/([。！？])/g,'$1\n')
    .split('\n')
    .map(s=>s.trim()).filter(Boolean);
}

export function makeIntroFromExtract(raw: string, title?: string, target = 180){
  let t = (raw || '')
    .replace(/^\s*(Title|URL\s*Source|Published\s*Time|Markdown\s*Content)\s*:.*$/gmi,'')
    .replace(/^=+.*=+$/gmi,'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,'')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g,'$1')
    .replace(/https?:\/\/\S+/g,'')
    .replace(/[ \t\u3000]+/g,' ')
    .replace(/\s*\n+\s*/g,'\n')
    .trim();

  const lines = splitSentences(t);
  const good: string[] = [];
  for (const s of lines) {
    if (s.length < 20) continue;
    if (s.replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}A-Za-z0-9]/gu,'').length < 8) continue;
    if (BAN.some(re=>re.test(s))) continue;
    good.push(s);
    if (good.join('').length >= target + 40) break;
  }
  let body = good.join('');

  if (title) {
    const nt = norm(title), nb = norm(body.slice(0, Math.min(200, body.length)));
    if (nt && nb.startsWith(nt)) {
      const p = body.indexOf('。');
      const cut = p>=0 && p<Math.max(title.length+4,60) ? p+1 : title.length;
      body = body.slice(cut).trim();
    }
  }

  if (body.length <= target) return body;
  const upto = body.slice(0, target + 40);
  const cut = Math.max(upto.lastIndexOf('。'), upto.lastIndexOf('！'), upto.lastIndexOf('？'));
  const out = cut >= 60 ? upto.slice(0, cut + 1) : body.slice(0, target);
  return out.trim() + (out.length < body.length ? '…' : '');
}


