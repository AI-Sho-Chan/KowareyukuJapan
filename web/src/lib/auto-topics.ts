import fs from 'node:fs';
import path from 'node:path';

export type AutoTopic = { id: string; keyword: string; enabled: boolean; minIntervalMinutes: number };

const DATA_DIR = path.join(process.cwd(), '.data');
const TOPICS_FILE = path.join(DATA_DIR, 'auto-topics.json');
const LOG_FILE = path.join(DATA_DIR, 'auto-news.log');

function ensureDir(){ try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }

export function loadTopics(): AutoTopic[] {
  ensureDir();
  try {
    const raw = fs.readFileSync(TOPICS_FILE, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {}
  return [];
}

export function saveTopics(items: AutoTopic[]): void {
  ensureDir();
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

export function appendLog(line: string): void {
  ensureDir();
  const ts = new Date().toISOString();
  try { fs.appendFileSync(LOG_FILE, `[${ts}] ${line}\n`, 'utf8'); } catch {}
}

export function readLogs(maxLines = 200): string[] {
  ensureDir();
  try {
    const raw = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    return lines.slice(-maxLines);
  } catch { return []; }
}

