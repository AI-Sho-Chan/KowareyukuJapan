import { NextRequest } from "next/server";

// 簡易メモリストアは親ルートから共有されないため、実運用ではDB必須
// ここではエンドポイントの骨子のみ用意

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // NOTE: メモリ実装は省略。本番ではownerKey照合後に削除
  return new Response(JSON.stringify({ ok: true, id, deleted: true }));
}


