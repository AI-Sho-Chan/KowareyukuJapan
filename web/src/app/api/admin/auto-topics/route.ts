import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { AutoTopic, loadTopics, saveTopics } from '@/lib/auto-topics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest){
  if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
  return NextResponse.json({ ok:true, topics: loadTopics() });
}

export async function POST(req: NextRequest){
  if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
  const body = await req.json().catch(()=>({} as any));
  const keyword = String(body.keyword||'').trim();
  const min = Math.max(10, Math.min(1440, Number(body.minIntervalMinutes||60)));
  if(!keyword) return NextResponse.json({ ok:false, error:'keyword required' }, { status:400 });
  const items = loadTopics();
  if (items.some(t => t.keyword === keyword)) return NextResponse.json({ ok:true, topics: items });
  const t: AutoTopic = { id: Math.random().toString(36).slice(2,10), keyword, enabled: true, minIntervalMinutes: min };
  items.push(t);
  saveTopics(items);
  return NextResponse.json({ ok:true, topics: items });
}

export async function DELETE(req: NextRequest){
  if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
  const q = req.nextUrl.searchParams;
  const id = q.get('id');
  const keyword = q.get('keyword');
  if(!id && !keyword) return NextResponse.json({ ok:false, error:'id or keyword required' }, { status:400 });
  const items = loadTopics();
  const next = items.filter(t => (id ? t.id !== id : true) && (keyword ? t.keyword !== keyword : true));
  saveTopics(next);
  return NextResponse.json({ ok:true, topics: next });
}

