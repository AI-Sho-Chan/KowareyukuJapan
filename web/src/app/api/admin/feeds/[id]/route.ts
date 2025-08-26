import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH: フィード更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;
    
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // 更新可能なフィールドをチェック
    const updates: string[] = [];
    const args: any[] = [];

    if ('enabled' in body) {
      updates.push('enabled = ?');
      args.push(body.enabled ? 1 : 0);
    }
    
    if ('name' in body) {
      updates.push('name = ?');
      args.push(body.name);
    }
    
    if ('category' in body) {
      updates.push('category = ?');
      args.push(body.category);
    }
    
    if ('check_interval_min' in body) {
      updates.push('check_interval_min = ?');
      args.push(body.check_interval_min);
    }
    
    if ('config_json' in body) {
      updates.push('config_json = ?');
      args.push(typeof body.config_json === 'string' ? body.config_json : JSON.stringify(body.config_json));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // 更新日時を追加
    updates.push('updated_at = ?');
    args.push(Math.floor(Date.now() / 1000));
    args.push(id);

    await db.execute({
      sql: `UPDATE feed_sources SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Failed to update feed:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: フィード削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const db = createClient({
      url: process.env.TURSO_DB_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // 関連するfeed_itemsも削除
    await db.execute({
      sql: `DELETE FROM feed_items WHERE source_id = ?`,
      args: [id],
    });

    // feed_logsも削除
    await db.execute({
      sql: `DELETE FROM feed_logs WHERE source_id = ?`,
      args: [id],
    });

    // フィード本体を削除
    await db.execute({
      sql: `DELETE FROM feed_sources WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Failed to delete feed:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}