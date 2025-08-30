import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { verifyAdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), '.data');
const NOTES_FILE = path.join(DATA_DIR, 'dev-notes.json');
const FALLBACK_MD = path.join(process.cwd(), 'docs', 'SESSION_NOTES.md');

function ensureDir(){ try{ fs.mkdirSync(DATA_DIR, { recursive: true }); } catch{} }

function seedFromFallback(){
  try{
    const md = fs.readFileSync(FALLBACK_MD, 'utf8');
    const obj = { lastUpdated: Date.now(), markdown: md };
    ensureDir();
    fs.writeFileSync(NOTES_FILE, JSON.stringify(obj, null, 2), 'utf8');
    return obj;
  } catch { return { lastUpdated: Date.now(), markdown: '' }; }
}

export async function GET(req: NextRequest){
  if(!verifyAdminSession(req)) return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
  try{
    const raw = fs.readFileSync(NOTES_FILE, 'utf8');
    const json = JSON.parse(raw);
    return NextResponse.json({ ok:true, notes: json });
  } catch {
    const seeded = seedFromFallback();
    return NextResponse.json({ ok:true, notes: seeded });
  }
}

