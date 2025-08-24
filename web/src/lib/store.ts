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

const g: any = globalThis as any;
if (!g.__mediaStore) g.__mediaStore = new Map<string, StoredMedia>();
if (!g.__postsStore) g.__postsStore = [] as StoredPost[];

export const mediaStore: Map<string, StoredMedia> = g.__mediaStore;
export const postsStore: StoredPost[] = g.__postsStore;


