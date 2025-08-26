export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'node:fs';
import path from 'node:path';

export async function GET() {
  const status: any = {
    ok: true,
    time: new Date().toISOString(),
    version: null as string | null,
    db: false,
    queue: 'unknown',
  };

  try {
    await db.execute('SELECT 1');
    status.db = true;
  } catch {
    status.ok = false;
    status.db = false;
  }

  try {
    const buildId = fs.readFileSync(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim();
    status.version = buildId;
  } catch {}

  return NextResponse.json(status, { status: status.ok ? 200 : 503, headers: { 'cache-control': 'no-cache' } });
}
