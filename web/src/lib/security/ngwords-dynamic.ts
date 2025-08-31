import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), '.data', 'ngwords.json');
const HITS_FILE = path.join(process.cwd(), '.data', 'ngword-hits.json');

export function loadDynamicNG(): string[] {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x:any)=> typeof x === 'string') : [];
  } catch { return []; }
}

export function saveDynamicNG(words: string[]): void {
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); } catch {}
  fs.writeFileSync(FILE, JSON.stringify(Array.from(new Set(words.map(w=>w.trim()).filter(Boolean))), null, 2), 'utf8');
}

export function checkDynamicNG(text: string): { blocked: boolean; word?: string } {
  const words = loadDynamicNG();
  const hay = String(text||'');
  for (const w of words) {
    if (!w) continue;
    if (hay.includes(w)) return { blocked: true, word: w };
  }
  return { blocked: false };
}

export function loadNgHitCounts(): Record<string, number> {
  try {
    const raw = fs.readFileSync(HITS_FILE, 'utf8');
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj as Record<string, number> : {};
  } catch { return {}; }
}

export function recordNgHit(word: string): void {
  try { fs.mkdirSync(path.dirname(HITS_FILE), { recursive: true }); } catch {}
  const counts = loadNgHitCounts();
  counts[word] = (counts[word] || 0) + 1;
  try { fs.writeFileSync(HITS_FILE, JSON.stringify(counts, null, 2), 'utf8'); } catch {}
}
