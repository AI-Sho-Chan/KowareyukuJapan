# Vercelデプロイ問題の詳細レポート

## 🎯 実行したいこと
KowareyukuJapan（守ろうJAPAN）というNext.js 15アプリケーションをVercelにデプロイして公開したい。

## 🔴 現在の問題
Vercelでビルドエラーが発生し続けており、デプロイが失敗している。

### 最新のエラーメッセージ
```
Error: Cannot find module 'tailwindcss'
```

場所: `src/app/layout.tsx`

## 📁 プロジェクト構造
```
C:\AI\KowareyukuJapan\
├── web\                 # Next.jsアプリケーション本体
│   ├── src\
│   │   ├── app\        # App Router
│   │   ├── components\ # Reactコンポーネント
│   │   └── lib\        # ユーティリティ
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tailwind.config.ts
│   └── vercel.json
└── vercel.json         # ルートレベルの設定
```

## 🛠️ これまでに試した対策と結果

### 1. Vercel設定の調整
**試したこと:**
- `vercel.json`でrootDirectoryを`web`に設定
- buildCommandから`cd web &&`を削除
- installCommandを`npm install`に変更

**結果:** `cd web: No such file or directory`エラー

### 2. Vercel UIから直接設定
**試したこと:**
- Settings → General → Build & Development Settings
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Root Directory: `web`

**結果:** インストールは成功したが、ビルド時にモジュールエラー

### 3. package.jsonの修正
**試したこと:**
- `"type": "module"`を削除
- `--turbopack`オプションを削除

**結果:** 一部改善したが、まだエラー

### 4. モジュールエラーの修正
**試したこと:**
- puppeteerをpuppeteer-coreに統一
- postcss.config.mjsを標準的な設定に変更
- NGWordCheckerをNGWordFilterV2に置換

**結果:** tailwindcssモジュールが見つからないエラーが残る

## 📄 関連ファイル

### `/web/package.json`
```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start",
    "start:prod": "next start -p 3030",
    "lint": "eslint",
    "migrate-db": "tsx src/scripts/migrate-to-db.ts"
  },
  "dependencies": {
    "@libsql/client": "^0.15.12",
    "@mozilla/readability": "^0.6.0",
    "@sentry/nextjs": "^10.5.0",
    "@sparticuz/chromium-min": "^119.0.0",
    "@tanstack/react-query": "5.85.5",
    "dotenv": "^17.2.1",
    "ffmpeg-static": "^5.2.0",
    "file-type": "^18.7.0",
    "fluent-ffmpeg": "^2.1.3",
    "jsdom": "^26.1.0",
    "next": "15.5.0",
    "puppeteer-core": "^22.13.1",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "sharp": "^0.33.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.0",
    "@types/fluent-ffmpeg": "^2.1.25",
    "@types/jsdom": "^21.1.7",
    "@types/node": "^20.14.11",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.2",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.4",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3"
  }
}
```

### `/web/postcss.config.mjs`
```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

### `/web/tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### `/vercel.json` (ルート)
```json
{
  "installCommand": "cd web && npm install --force",
  "buildCommand": "cd web && npm run build",
  "outputDirectory": "web/.next"
}
```

### `/web/vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/feed-check",
      "schedule": "0 3 * * *"
    }
  ]
}
```

## 🔍 問題の核心

1. **tailwindcssパッケージが依存関係に含まれていない**
   - package.jsonのdependenciesにもdevDependenciesにもtailwindcssが存在しない
   - しかし、アプリケーションはTailwind CSSを使用している

2. **Vercelのビルド環境とローカル環境の差異**
   - ローカルでは`npm run dev`が正常に動作
   - Vercelでのビルドのみ失敗

## 💡 推奨される解決策

1. **必要なパッケージを追加**
```bash
cd web
npm install --save-dev tailwindcss autoprefixer postcss
```

2. **package-lock.jsonを再生成**
```bash
rm package-lock.json
npm install
```

3. **Vercel設定を統一**
- ルートの`vercel.json`を削除するか、正しく設定
- または、webフォルダ内ですべて完結させる

## 🌐 Vercel環境情報
- URL: https://vercel.com/shos-projects-e8701e37/kowareyuku-japan
- Region: Washington, D.C., USA (East) - iad1
- Framework: Next.js (自動検出)
- Node Version: 18.x (推定)

## 📊 環境変数（設定済み）
- TURSO_DB_URL = file:local.db
- NEXT_PUBLIC_BASE_URL = https://kowareyuku-japan.vercel.app
- SESSION_SECRET = (設定済み)
- ADMIN_PASSWORD = admin123
- ENABLE_BASIC_AUTH = true
- BASIC_AUTH_USER = admin
- BASIC_AUTH_PASSWORD = test123

## 🚨 緊急度
高 - 本番環境へのデプロイがブロックされている

## 📝 追加情報
- GitHubリポジトリ: https://github.com/AI-Sho-Chan/KowareyukuJapan
- ローカル開発環境: Windows
- Next.js バージョン: 15.5.0
- React バージョン: 19.1.0

---

このレポートは2025年8月26日に作成されました。
問題解決後は、このファイルを削除してください。