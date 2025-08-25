import { NextRequest, NextResponse } from "next/server";
import { deletePostById, postsStore } from "@/lib/store";

function getOwnerKey(req: NextRequest): string { return req.headers.get('x-owner-key') || req.headers.get('x-client-key') || ''; }

// 簡易メモリストアは親ルートから共有されないため、実運用ではDB必須
// ここではエンドポイントの骨子のみ用意

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = getOwnerKey(req);
  const idx = postsStore.findIndex(p => p.id === id);
  if (idx < 0) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  if (!key || postsStore[idx].ownerKey !== key) return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 });
  const ok = deletePostById(id);
  if (!ok) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, id, deleted: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = getOwnerKey(req);
  const body = await req.json().catch(() => ({} as any));
  const idx = postsStore.findIndex(p => p.id === id);
  if (idx < 0) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  if (!key || postsStore[idx].ownerKey !== key) return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 });
  if (Array.isArray(body.tags)) {
    postsStore[idx].tags = body.tags as string[];
  }
  if (typeof body.handle === 'string') {
    postsStore[idx].handle = body.handle;
  }
  if (typeof body.comment === 'string') {
    postsStore[idx].comment = body.comment;
  }
  return NextResponse.json({ ok: true, post: postsStore[idx] }, { headers: { 'content-type': 'application/json' } });
}


