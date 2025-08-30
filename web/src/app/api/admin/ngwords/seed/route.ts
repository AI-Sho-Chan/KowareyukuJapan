import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { loadDynamicNG, saveDynamicNG } from '@/lib/security/ngwords-dynamic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 既存の運用で使っていた代表的なNG語を初期投入できるようにします。
// （コード内ベースライン。必要に応じて編集可能）
const BASELINE: string[] = [
  // サイト攻撃系
  'kowareyukujapan','こわれゆくジャパン','こわれゆく日本','クソサイト','ゴミサイト','糞サイト','カスサイト',
  // 暴力・死ね系
  '死ね','殺す','コロス','くたばれ','消えろ','4ね','564',
  // 反日・蔑称（一部）
  'ジャップ','JAP','jap','倭猿','日本猿','日本死ね',
  // 天皇関連（攻撃文脈の代表）
  '天皇死','天皇要らない','天皇制廃止',
  // スパム/出会い系（代表）
  '簡単副業','月収100万','オンラインカジノ','出会い系','アダルト','セフレ',
];

export async function POST(req: NextRequest){
  try{
    if (!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
    const cur = loadDynamicNG();
    const merged = Array.from(new Set([...cur, ...BASELINE]));
    saveDynamicNG(merged);
    return NextResponse.json({ ok:true, words: merged, added: merged.length - cur.length });
  } catch (e:any){
    return NextResponse.json({ ok:false, error: String(e?.message||e) }, { status:500 });
  }
}

