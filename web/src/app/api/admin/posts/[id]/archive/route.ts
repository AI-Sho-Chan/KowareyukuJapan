import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  const { id } = await params;
  await db.execute({ sql: `UPDATE posts SET is_published = 0, status = 'hidden', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, args: [id] });
  return NextResponse.json({ ok:true });
}
