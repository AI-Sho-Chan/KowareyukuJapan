import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { NGWordFilterV2 } from '@/lib/security';
import { checkDynamicNG } from '@/lib/security/ngwords-dynamic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest){
  if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
  const { text } = await req.json();
  const v2 = NGWordFilterV2.check(String(text||''));
  const dyn = checkDynamicNG(String(text||''));
  return NextResponse.json({ ok:true, blocked: !!(v2?.blocked || v2?.isBlocked || dyn.blocked), details: { v2, dyn } });
}

