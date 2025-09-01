import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import crypto from 'crypto';
import { NGWordFilterV2 } from '@/lib/security';
import { checkDynamicNG } from '@/lib/security/ngwords-dynamic';
import { headers } from 'next/headers';

export const runtime = 'nodejs';

// POST: コメント投稿
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    const body = await request.json();
    const { content, author_name, author_key } = body;
    
    // バリデーション
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'コメント内容が必要です' },
        { status: 400 }
      );
    }
    
    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'コメントは1000文字以内にしてください' },
        { status: 400 }
      );
    }
    
    // NGワードチェック
    const ngCheck = NGWordFilterV2.check(content);
    const dyn = checkDynamicNG(content);
    if (ngCheck.isBlocked || dyn.blocked) {
      return NextResponse.json(
        { error: '禁止ワードが含まれています' },
        { status: 400 }
      );
    }
    
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    
    // 投稿情報を取得
    const postResult = await db.execute({
      sql: `SELECT owner_key, 
            (SELECT COUNT(*) FROM comments WHERE post_id = ?) as comment_count
            FROM posts WHERE id = ?`,
      args: [postId, postId]
    });
    
    if (postResult.rows.length === 0) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }
    
    const post = postResult.rows[0];
    const ownerKey = post.owner_key as string;
    const commentCount = Number(post.comment_count);
    
    // コメントルールのチェック
    if (ownerKey === 'ADMIN_OPERATOR') {
      // 運営投稿の場合：最初の1コメントのみ許可
      if (commentCount >= 1) {
        return NextResponse.json(
          { error: '運営の投稿には既にコメントが付いています' },
          { status: 403 }
        );
      }
    } else {
      // ユーザー投稿の場合：投稿者本人のみコメント可能
      if (author_key !== ownerKey) {
        return NextResponse.json(
          { error: 'この投稿にはコメントできません' },
          { status: 403 }
        );
      }
    }
    
    // IPアドレス取得（プライバシーのためハッシュ化）
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    
    // コメントを保存
    const commentId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await db.execute({
      sql: `INSERT INTO comments (
        id, post_id, author_name, author_key, content,
        ip_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        commentId,
        postId,
        author_name || '名無しさん',
        author_key || null,
        content,
        ipHash,
        now,
        now
      ]
    });
    
    // 監査ログ記録
    await db.execute({
      sql: `INSERT INTO audit_logs (
        id, user_id, action, resource_type, resource_id,
        ip_address, user_agent, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        author_key || 'anonymous',
        'comment_create',
        'comment',
        commentId,
        ipHash,
        headersList.get('user-agent')?.slice(0, 255) || '',
        JSON.stringify({ post_id: postId, is_admin_post: ownerKey === 'ADMIN_OPERATOR' }),
        now
      ]
    });
    
    return NextResponse.json({
      ok: true,
      comment: {
        id: commentId,
        author_name: author_name || '名無しさん',
        content,
        created_at: now
      }
    });
    
  } catch (error: any) {
    console.error('Comment creation error:', error);
    
    return NextResponse.json(
      { error: 'コメントの投稿に失敗しました' },
      { status: 500 }
    );
  }
}

// GET: コメント取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    // count only mode
    const onlyCount = request.nextUrl.searchParams.get('count') === '1';
    if (onlyCount) {
      const c = await db.execute({ sql: `SELECT COUNT(*) as c FROM comments WHERE post_id = ?`, args: [postId] });
      const n = Number((c.rows[0] as any)?.c || 0);
      return NextResponse.json({ ok: true, count: n });
    }

    const comments = await db.execute({
      sql: `SELECT id, author_name, content, created_at
            FROM comments
            WHERE post_id = ?
            ORDER BY created_at ASC`,
      args: [postId]
    });
    
    return NextResponse.json({
      ok: true,
      comments: comments.rows.map(row => ({
        id: row.id,
        author_name: row.author_name,
        content: row.content,
        created_at: row.created_at
      }))
    });
    
  } catch (error: any) {
    console.error('Failed to fetch comments:', error);
    
    return NextResponse.json(
      { error: 'コメントの取得に失敗しました' },
      { status: 500 }
    );
  }
}
