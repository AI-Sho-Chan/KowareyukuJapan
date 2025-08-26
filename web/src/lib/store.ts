export type StoredMedia = { contentType: string; data: Buffer; ownerKey: string };

export type StoredPost = {
  id: string;
  url?: string;
  media?: { type: "image" | "video"; id: string; url: string };
  title: string;
  comment?: string;
  handle?: string;
  tags?: string[];
  createdAt: number;
  ownerKey: string;
};

import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), '.data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const POSTS_FILE_BAK = path.join(DATA_DIR, 'posts.json.bak');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

function ensureDirs(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
  } catch {}
}

function loadPostsFromDisk(): StoredPost[] {
  ensureDirs();
  try {
    if (!fs.existsSync(POSTS_FILE)) return [];
    const raw = fs.readFileSync(POSTS_FILE, 'utf8');
    const json = JSON.parse(raw);
    return Array.isArray(json) ? (json as StoredPost[]) : [];
  } catch {
    return [];
  }
}

export function persistPostsToDisk(): void {
  ensureDirs();
  try {
    const json = JSON.stringify(postsStore, null, 2);
    // 原子的に書き込む: tmp→rename
    const tmp = POSTS_FILE + '.tmp';
    fs.writeFileSync(tmp, json, 'utf8');
    fs.renameSync(tmp, POSTS_FILE);
    // バックアップも更新
    fs.writeFileSync(POSTS_FILE_BAK, json, 'utf8');
  } catch {}
}

function mediaDataPath(id: string): string { return path.join(MEDIA_DIR, id); }
function mediaMetaPath(id: string): string { return path.join(MEDIA_DIR, `${id}.json`); }

export function saveMediaToDisk(id: string, contentType: string, ownerKey: string, data: Buffer): void {
  ensureDirs();
  try {
    fs.writeFileSync(mediaDataPath(id), data);
    fs.writeFileSync(mediaMetaPath(id), JSON.stringify({ contentType, ownerKey }), 'utf8');
  } catch {}
}

export function loadMediaFromDisk(id: string): StoredMedia | null {
  ensureDirs();
  try {
    const metaRaw = fs.readFileSync(mediaMetaPath(id), 'utf8');
    const meta = JSON.parse(metaRaw) as { contentType: string; ownerKey: string };
    const bin = fs.readFileSync(mediaDataPath(id));
    return { contentType: meta.contentType, ownerKey: meta.ownerKey, data: bin };
  } catch {
    return null;
  }
}

export function deleteMediaFromDisk(id: string): void {
  try { fs.unlinkSync(mediaDataPath(id)); } catch {}
  try { fs.unlinkSync(mediaMetaPath(id)); } catch {}
}

const g: any = globalThis as any;
if (!g.__mediaStore) g.__mediaStore = new Map<string, StoredMedia>();
if (!g.__postsStore) g.__postsStore = loadPostsFromDisk();

export const mediaStore: Map<string, StoredMedia> = g.__mediaStore;
export const postsStore: StoredPost[] = g.__postsStore;

export function deletePostById(id: string): boolean {
  const idx = postsStore.findIndex(p => p.id === id);
  if (idx < 0) return false;
  const p = postsStore[idx];
  if (p.media) {
    deleteMediaFromDisk(p.media.id);
    try { mediaStore.delete(p.media.id); } catch {}
  }
  postsStore.splice(idx, 1);
  persistPostsToDisk();
  return true;
}


