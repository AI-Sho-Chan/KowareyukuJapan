import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), '.data', 'ngwords.json');

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

