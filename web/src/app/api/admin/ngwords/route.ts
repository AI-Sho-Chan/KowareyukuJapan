import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { loadDynamicNG, saveDynamicNG } from '@/lib/security/ngwords-dynamic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  if (!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  const { loadNgHitCounts } = await import('@/lib/security/ngwords-dynamic'); return NextResponse.json({ ok:true, words: loadDynamicNG(), counts: loadNgHitCounts() });
}

export async function POST(req: NextRequest){
  if (!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  const { action, word } = await req.json();
  const list = loadDynamicNG();
  if (action === 'add') {
    if (typeof word === 'string' && word.trim()) { list.push(word.trim()); saveDynamicNG(list); }
    const { loadNgHitCounts } = await import('@/lib/security/ngwords-dynamic'); return NextResponse.json({ ok:true, words: loadDynamicNG(), counts: loadNgHitCounts() });
  }
  if (action === 'remove') {
    const next = list.filter(w => w !== word);
    saveDynamicNG(next);
    const { loadNgHitCounts } = await import('@/lib/security/ngwords-dynamic'); return NextResponse.json({ ok:true, words: loadDynamicNG(), counts: loadNgHitCounts() });
  }
  return NextResponse.json({ ok:false, error:'invalid action' }, { status: 400 });
}


