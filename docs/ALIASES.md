# パスエイリアスとユーティリティのバレル

このプロジェクトでは以下のエイリアスを定義しています。

- `@/…` → `src/…`
- `@utils` / `@utils/…` → `src/utils/index` / `src/utils/…`

## 目的

- 相対パスのネスト (`../../..`) を解消して読みやすく。
- ツール間（TypeScript/Vite/webpack/Jest）で同じ解決規則を共有。
- ディレクトリ移動やリファクタ時の影響を最小化。
- IDE の補完・ジャンプが安定。

## 設定ファイル

- TypeScript: `tsconfig.json`
- Vite: `vite.config.ts`
- webpack: `webpack.config.js`
- Jest: `jest.config.ts`

## ユーティリティのバレル

- エントリ: `src/index.ts`（`export * from './utils'`）
- 自動生成: `scripts/generate-utils-index.cjs` を実行すると、`src/utils/index.ts` に `export *` が自動生成されます。

```bash
node scripts/generate-utils-index.cjs
```

`src/utils` 配下の `.ts/.tsx` を走査し、`index.ts`・`*.test.ts`・`*.d.ts` は除外します。

