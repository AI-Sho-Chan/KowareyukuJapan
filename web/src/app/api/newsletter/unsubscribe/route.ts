import { NextRequest, NextResponse } from 'next/server';
import { db, formatDate } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  if (!token) return NextResponse.json({ ok:false, error:'token_required' }, { status:400 });
  const r = await db.execute({ sql: `SELECT email FROM subscribers WHERE token=?`, args: [token] });
  if (!r.rows.length) return NextResponse.json({ ok:false, error:'invalid_token' }, { status:400 });
  const email = (r.rows[0] as any).email as string;
  await db.execute({ sql: `UPDATE subscribers SET status='unsubscribed', updated_at=? WHERE email=?`, args: [formatDate(), email] });
  return NextResponse.json({ ok:true, email });
}


