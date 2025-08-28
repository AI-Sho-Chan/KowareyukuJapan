# KowareyukuJapan（守ろう日本）プロジェクト引継書

## プロジェクト概要
- **プロジェクト名**: KowareyukuJapan（守ろう日本）
- **目的**: 日本を守るための情報共有プラットフォーム
- **技術スタック**: Next.js 15.5.0, TypeScript, React, Tailwind CSS
- **データベース**: Turso DB（SQLite Cloud）
- **ホスティング**: Vercel
- **開発ディレクトリ**: C:\AI\KowareyukuJapan

## Vercel移行・本番環境デプロイ状況

### 1. デプロイ完了情報
- **本番URL**: https://kowareyuku-japan.vercel.app
- **デプロイ状態**: ✅ 成功（ビルドは通過）
- **フレームワーク**: Next.js（自動検出）
- **ルートディレクトリ**: web/
- **カスタムドメイン予定**: MamorouNippon.jp（未設定）

### 2. Turso DB接続情報
- **データベースURL**: libsql://kowareyuku-japan-ai-sho-chan.aws-ap-northeast-1.turso.io
- **認証トークン**: Vercel環境変数に設定済み
- **環境変数名**: 
  - TURSO_DATABASE_URL
  - TURSO_AUTH_TOKEN

### 3. Vercel設定ファイル
```json
// vercel.json
{
  "framework": "nextjs",
  "rootDirectory": "web"
}
```

## 現在の問題点

### 1. UI表示問題 🔴 重大
**症状**: 
- 開発環境で正常に表示されていたUIが本番環境で崩れている
- CSSスタイルが適用されていない
- レイアウトが完全に崩れている

**確認済みの状態**:
- 赤いヘッダータイトルは表示される
- デモ投稿が表示されない
- カード型のレイアウトが適用されていない

### 2. API 500エラー 🔴 重大
**症状**:
- /api/posts エンドポイントが500エラーを返す
- デモデータへの切り替え後も問題が継続

### 3. CSS適用方法の混乱
**試行した方法**:
1. CSS Modules (`page.module.css`) → 失敗
2. Global CSS (`styles.css`) → 失敗
3. Tailwind CSS → 部分的に動作

## これまでの対策と結果

### 1. CSS問題への対策
| 対策 | 結果 | ファイル |
|------|------|----------|
| CSS Modulesから通常CSSへ変更 | ❌ スタイル未適用 | `web/src/app/page.tsx`, `styles.css` |
| Tailwind CSS v4→v3ダウングレード | ⚠️ 部分改善 | `web/package.json` |
| CSPに'unsafe-inline'追加 | ✅ ビルド成功 | `web/next.config.mjs` |
| PostCSSとAutoprefixer追加 | ✅ インストール成功 | `web/package.json` |

### 2. API エラーへの対策
| 対策 | 結果 | ファイル |
|------|------|----------|
| データベース接続をデモデータに変更 | ❌ 500エラー継続 | `web/src/app/api/posts/route.ts` |
| エラーハンドリング強化 | ⚠️ エラーは返すが原因不明 | 同上 |
| middleware.ts削除 | ✅ ビルドエラー解消 | 削除済み |

## 重要なコードセクション

### 1. 現在のpage.tsx（問題あり）
```typescript
import './styles.css';  // グローバルCSS読み込み

// クラス名を直接文字列で指定
<header className="site-header">
  <div className="site-brand">
    <Link href="/" className="brand-title">
      守ろう<span className="site-accent">日本</span>
    </Link>
```

### 2. API Route（簡略化版）
```typescript
// web/src/app/api/posts/route.ts
export async function GET(req: NextRequest) {
  // デモデータを返すように簡略化
  const demoPosts = [...];
  return NextResponse.json({
    ok: true,
    posts: demoPosts
  });
}
```

### 3. Tailwind設定
```javascript
// web/tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // ...
}
```

## 必要なアクション（優先順位順）

### 1. 🔴 緊急: UI修復
```bash
# 開発環境で動作確認
cd web
npm run dev
# http://localhost:3000 で正常なUIを確認

# 本番との差分を特定
# 1. DevToolsでCSSが読み込まれているか確認
# 2. ネットワークタブで404エラーがないか確認
# 3. コンソールエラーを確認
```

### 2. 🔴 緊急: API修復
```bash
# ローカルでAPIテスト
curl http://localhost:3000/api/posts

# Vercelログ確認
vercel logs --follow
```

### 3. 🟡 重要: CSS戦略の統一
開発環境で動作していた方法を確認し、それに統一する：
- Tailwind CSSのみ使用
- または Global CSS のみ使用
- CSS Modulesは避ける（問題が多い）

### 4. 🟡 重要: 環境変数確認
```bash
# Vercel環境変数
vercel env ls

# 必要な環境変数
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
NEXT_PUBLIC_BASE_URL
```

## ファイル構造
```
KowareyukuJapan/
├── web/                        # Next.jsアプリケーション
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # メインページ（UI問題あり）
│   │   │   ├── styles.css     # グローバルスタイル
│   │   │   ├── page.module.css # 未使用（問題の原因？）
│   │   │   └── api/
│   │   │       └── posts/
│   │   │           └── route.ts # API（500エラー）
│   │   └── lib/
│   │       └── db.ts          # データベース接続
│   ├── tailwind.config.js     # Tailwind設定
│   ├── package.json           # 依存関係
│   ├── next.config.mjs        # Next.js設定（CSP含む）
│   └── vercel.json            # Vercelデプロイ設定
└── 引継書_KowareyukuJapan_プロジェクト.md # この文書

```

## 推奨される次のステップ

### 1. 開発環境の正確な再現
```bash
# クリーンインストール
cd web
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 2. スタイリング方法の統一
開発時に動作していた方法を特定し、その方法のみを使用：
- おすすめ: Tailwind CSS のみ（`className="bg-red-600 text-white"`）
- styles.cssは削除またはTailwindの@applyディレクティブ使用

### 3. 段階的デプロイ
```bash
# プレビューデプロイでテスト
vercel --prod=false

# 問題なければ本番デプロイ
vercel --prod
```

## 連絡先・参考情報
- **Vercelプロジェクト**: https://vercel.com/[your-account]/kowareyuku-japan
- **GitHub リポジトリ**: [未設定の場合は作成推奨]
- **Turso Dashboard**: https://turso.tech/

## 引き継ぎ時の注意事項

### やるべきこと ✅
1. 開発環境で正常に動作することを確認
2. CSSの適用方法を1つに統一
3. エラーログを詳細に確認
4. 小さな変更から段階的にテスト

### やってはいけないこと ❌
1. 複数のCSS方法を同時に試す
2. 本番環境で直接デバッグ
3. 環境変数を公開する
4. データベーススキーマを急に変更

## トラブルシューティング

### CSS が適用されない場合
1. `npm run build` でビルドエラーがないか確認
2. `.next/` フォルダを削除して再ビルド
3. `tailwind.config.js` の content 配列を確認
4. PostCSSの設定を確認

### API 500エラーの場合
1. Vercel Functions ログを確認
2. 環境変数が正しく設定されているか確認
3. ローカルでは動作するか確認
4. CORS設定を確認

### データベース接続エラーの場合
1. Turso DBのステータス確認
2. 認証トークンの有効期限確認
3. ネットワーク接続確認

---

## 最終更新日時
2025年1月26日

## 作成者
Claude (Anthropic)

## 引き継ぎ先
次の開発者またはAIアシスタント

---

この文書は、KowareyukuJapanプロジェクトの現状と問題点を包括的にまとめたものです。
開発を継続する際は、まず開発環境での動作確認から始めることを強く推奨します。
