export type StoredMedia = { contentType: string; data: Buffer; ownerKey: string };

export type StoredPost = {
  id: string;
  url?: string;
  media?: { type: "image" | "video"; id: string; url: string };
  title: string;
  comment?: string;
  handle?: string;
  createdAt: number;
  ownerKey: string;
};

import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), '.data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

function ensureDataDir(): void {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
}

function loadPostsFromDisk(): StoredPost[] {
  ensureDataDir();
  try {
    if (!fs.existsSync(POSTS_FILE)) return [];
    const raw = fs.readFileSync(POSTS_FILE, 'utf8');
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json as StoredPost[] : [];
  } catch {
    return [];
  }
}

export function persistPostsToDisk(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(postsStore, null, 2), 'utf8');
  } catch {}
}

const g: any = globalThis as any;
if (!g.__mediaStore) g.__mediaStore = new Map<string, StoredMedia>();
if (!g.__postsStore) g.__postsStore = loadPostsFromDisk();

export const mediaStore: Map<string, StoredMedia> = g.__mediaStore;
export const postsStore: StoredPost[] = g.__postsStore;


