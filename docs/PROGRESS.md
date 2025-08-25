## 進捗サマリ（最新）

### サーバー・ビルド/起動まわり
- 500 の主因（app配下の壊れた manifest/favicon）を解消。
  - `web/src/app/manifest.ts`・`web/src/app/icon.svg` を削除。
  - 静的 `web/public/manifest.webmanifest` を正規化し、`/icons/*` を参照。
  - `web/src/app/layout.tsx` の `metadata.manifest` と `metadata.icons` を設定。
- ポート競合（3000）時は `npx next dev -p 3001` を推奨。

### 埋め込み
- can-embed 判定修正: `frame-ancestors` は `'none'` のときのみブロック扱い。
- Instagram: `data-instgrm-captioned` 追加、IFRAME は `/embed/captioned`、`referrerPolicy` 追加。
- YouTube: `allow` に `fullscreen` を含め、`allowfullscreen` を廃止（警告回避）。
 - Instagram（追加）: URL正規化ユーティリティ追加、`/api/instagram/probe` と `/api/instagram/preview` を実装し、カードはプローブ主導で公式→IFRAME→プレビューへフォールバック。不可判定は24hローカルキャッシュ。不可理由のUI表示を追加。

### 投稿フォームUX
- 記録ボタン: アップロード中の無効化/ビジー表示、完了メッセージ表示。
- 画像: クライアントで 1600px/品質0.85 に縮小してから送信。
- サーバー: 画像8MB、動画60MBの上限設定（413）。

### 画像/動画のサーバー処理
- 画像: `sharp` により 1600px以内・JPEG品質80・メタデータ除去で再圧縮。
- 動画: `fluent-ffmpeg` + `ffmpeg-static` + `ffprobe-static` により最長3分、必要に応じ720p/H.264/AACへ再エンコード。
- `next.config.ts` の `serverExternalPackages` に関連パッケージを追加。

### ファイル一覧（主な変更）
- 追加/更新
  - `web/public/manifest.webmanifest`
  - `web/src/app/layout.tsx`
  - `web/src/app/api/can-embed/route.ts`
  - `web/src/components/InstagramEmbedCard.tsx`
  - `web/src/components/YouTubeEmbedCard.tsx`
  - `web/src/app/page.tsx`
  - `web/src/app/api/posts/route.ts`
  - `web/next.config.ts`
  - `web/package.json`
- 削除
  - `web/src/app/manifest.ts`
  - `web/src/app/icon.svg`

## 残タスク/次アクション
- dev の安定起動: `cd web && npx next dev -p 3001` で起動確認（3000競合回避）。
- 進捗UIの拡張: 動画アップロードの進捗％表示（XHRの `upload.onprogress` ベース）。
- 画像最適化の細分化: WebP対応、より低解像度プリセットの追加。
- 動画の上限方針: 尺/解像度/ビットレートの運用値決定とUIメッセージ反映。

## トラブルシュート
- 500 (manifest/favicon): `app/manifest.*` や `app/icon.*` を削除、`public` を参照。
- `ERR_BLOCKED_BY_CLIENT`: 広告ブロッカー由来で無視可。
- http/https 混在: ローカルを https でプロキシすれば警告低減（機能影響なし）。
 - Instagram埋め込み不可の例（vv9204uk）:
   - 対象: https://www.instagram.com/reel/DMrzdacTmy8/
   - /embed/captioned/: 200 だが本文は「利用できません」相当、`X-Frame-Options: DENY`
   - Probe: `{ ok:false, unavailable:true, blocked:true }`
   - 結論: 先方制限で埋め込み不可。プレビューへ即時フォールバックが正。
# 開発状況・進捗・引き継ぎメモ

このドキュメントだけ読めば、別の開発者/AIでも作業を即時引き継げます。

## 現状サマリ（2025-08-25 時点）
- フロント: Next.js 15 App Router（`web/`）
- 主要機能:
  - X(旧Twitter)埋め込みカード `XEmbedCard`
    - フォールバック順: 公式JS `createTweet` → 直接IFRAME(`Tweet.html`) → スクショ+要約
    - IFRAME属性強化(allowfullscreen, fullscreen 等)・高さ自動連携(`twttr.embed`)
    - ユーザー入力タイトルを最優先。未入力時はoEmbedテキストから日本語32字程度を自動生成（記号/URL除去）
    - 記録者ハンドル表示: 「記録者：＠ハンドル」
  - 一般Web埋め込みカード `InlineEmbedCard`
    - 事前判定APIでIFRAME可否を確認し、不可なら必ずプレビュー/リーダービューへ自動切替
    - プレビュー: OGP由来のタイトル/サムネ（既存API）＋テキスト抽出（`/api/article-extract`）
    - 画像/動画ファイル投稿はそのまま表示
  - タグ機能
    - 固定カテゴリの手動選択UI（複数可）
    - 固定タグ: 「治安/マナー」「ニュース」「政治/制度」「動画」「画像」「外国人犯罪」「中国人」「クルド人」「媚中政治家」「財務省」「官僚」「左翼」「保守」「日本」「帰化人」「帰化人政治家」「歴史捏造」
    - 未入力時はルールベース自動付与（コメント語句/ドメイン/種類から最大3件）
    - 各カードでタグ編集UI（PATCH）
  - 投稿永続化
    - 投稿は `.data/posts.json` に保存（gitignore済）
    - メディアは現状メモリ保持（永続化は未対応）
  - CSP/起動モード
    - 開発(3000): CSP無効
    - 本番(3030): 送出（`frame-src https: http: data: https://platform.twitter.com` 等）
  - 健康診断API: `/api/ok`

## 実装したAPI
- `GET /api/can-embed?url=`: 埋め込み可否
  - HEAD→GETフォールバック、`x-frame-options`/`content-security-policy`を解析
  - 失敗時も200で `{ ok:false, canEmbed:false }` を返し、UIは必ずフォールバック
- `GET /api/article-extract?url=`: リーダービュー抽出
  - `https://r.jina.ai/` を利用し先頭抜粋を返却（最大8KB）
  - 失敗時も200で `{ ok:false }`
- `GET /api/metadata` ほか: OGP/Twitter/JSON-LDからタイトル・画像抽出
- `GET/POST /api/posts`、`PATCH /api/posts/[id]`（タグ/ハンドル更新）
- `GET /api/posts/media/[id]`: メディア取得（メモリ）
- `GET /api/ok`: ランタイムヘルス

全APIは `NextResponse.json` を使用し、500を避ける方針で統一済み。

## 起動/確認（Windows PowerShell）
- 前提: `cd web` 済み、依存は `npm i`
- 開発(3000)
  - 起動: `npm run dev`
  - 確認: ブラウザ `http://localhost:3000/`
  - API: `curl -s http://localhost:3000/api/ok`
- 本番(3030)
  - ビルド: `npm run build`
  - 起動: `$env:NODE_ENV='production'; npm run start:prod`
  - CSP確認: `curl -I http://localhost:3030/` に `Content-Security-Policy` が含まれる

## 埋め込みポリシーの要点
- 親CSPは開発で無効/本番で有効。
- IFRAME可否は必ず `/api/can-embed` で事前判定。
- `canEmbed:false` なら IFRAMEを描画しない（ブロック文言が出る経路を断つ）。
- 代表的な埋め込み不可サイト例（先方XFO/CSP）:
  - `https://yoshiko-sakurai.jp/2005/07/02/396`（高確率で不可）
  - フォールバックはプレビュー＋抽出テキスト＋出典リンク

## 重要なUI仕様
- Xカード: 公式→IFRAME→スクショの順でフォールバック。タイトルは「ユーザー > 自動 > 既定」の優先。
- 一般ページ: 事前判定→不可なら読書モード。引用元へのリンクを常備。
- 記録者表示: 「記録者：＠ハンドル」（未入力時＠guest）
- タグ: 固定リストから選択。未選択時は自動候補（最大3件）。カードで即時編集可能。

## 既知の制約/積み残し
- メディア永続化は未対応（現状メモリ）。大きなファイルやプロセス再起動で消失。
- 検索/絞り込みUIは未実装（タグ/テキスト）
- スクショ系（`/api/x-screenshot` 他）は環境依存（Puppeteer/Chromiumの実行権限）
- テスト/型の網羅は未実施（単体/統合/型検証の追加が必要）
- 一部APIに古い `Response.json` が残っていないかは新規追加時も注意（現時点の主要APIは統一済み）

## 次作業の推奨プラン
1) 検索・フィルタ
   - タグフィルタ＋キーワード検索のUI/クエリを追加
2) メディア永続化
   - `.data/media/` へ保存＋GETでディスク読み出し（所有キー`ownerKey`検証は簡易でも追加）
3) 安全/運用
   - レート制限、簡易認証（署名付き`ownerKey`）、ログ出力
   - エラーバウンダリ・トースト通知整備
4) 低コスト要約/分類
   - ルールベースに加え、小型モデルや外部APIへの切替をオプション化
5) UI/UX
   - タイトル字数設定（24/28/32）、タグ説明ツールチップ、カードの読みやすさ調整
6) 自動テスト
   - API/コンポーネントのスモークテスト、`/api/ok`・`/api/can-embed` ヘルスチェック

## トラブルシュート
- 500/接続拒否: 実行場所が `web/` でない・本番起動引数ミスが典型（PowerShellは引数解釈に注意）。
- 埋め込みで「ブロック」表示: `can-embed` を先に叩いているか、IFRAMEを描いていないかを確認。
- CSPが厳しくて開発で壊れる: devではCSPを送らない実装（`next.config.ts`）を維持。

## 主要ファイル
- `web/src/components/XEmbedCard.tsx`
- `web/src/components/InlineEmbedCard.tsx`
- `web/src/app/api/{can-embed,article-extract,metadata,posts,...}/route.ts`
- `web/src/lib/store.ts`（`.data/posts.json` 永続化）
- `web/next.config.ts`（CSP/headers）
- `web/package.json`（`dev`, `start:prod`）

以上。
