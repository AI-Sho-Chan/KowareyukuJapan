import { NextRequest, NextResponse } from "next/server";
import { PostsRepository } from "@/lib/db/posts-repository";

const postsRepo = new PostsRepository();

function getOwnerKey(req: NextRequest): string { 
  return req.headers.get('x-owner-key') || req.headers.get('x-client-key') || ''; 
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const post = await postsRepo.getPost(id);
    if (!post) {
      return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = getOwnerKey(req);
  
  try {
    const post = await postsRepo.getPost(id);
    if (!post) {
      return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    }
    
    // Check ownership
    if (!key || post.ownerKey !== key) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    
    const deleted = await postsRepo.deletePost(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'Failed to delete' }, { status: 500 });
    }
    
    return NextResponse.json({ ok: true, id, deleted: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ ok: false, error: 'Failed to delete post' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const key = getOwnerKey(req);
  const body = await req.json().catch(() => ({} as any));
  
  try {
    const post = await postsRepo.getPost(id);
    if (!post) {
      return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    }
    
    // Check ownership
    if (!key || post.ownerKey !== key) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    
    const updates: any = {};
    if (Array.isArray(body.tags)) {
      updates.tags = body.tags as string[];
    }
    // Note: handle field is not in the updatePost method signature
    // We may need to add it later if needed
    if (typeof body.comment === 'string') {
      updates.comment = body.comment;
    }
    if (typeof body.title === 'string') {
      updates.title = body.title;
    }
    
    const success = await postsRepo.updatePost(id, updates);
    if (!success) {
      return NextResponse.json({ ok: false, error: 'Failed to update' }, { status: 500 });
    }
    
    // Fetch the updated post to return it
    const updatedPost = await postsRepo.getPost(id);
    return NextResponse.json({ ok: true, post: updatedPost }, { headers: { 'content-type': 'application/json' } });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update post' }, { status: 500 });
  }
}