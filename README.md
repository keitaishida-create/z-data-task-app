# z-data Task

z-data チーム (Keita / Harry / Takumi) の共有タスク管理 PWA。

- フロント: React 19 + Vite + TypeScript + vite-plugin-pwa
- バック: Google Apps Script (GAS) Webアプリ
- DB: Google Spreadsheet (`Z_タスク管理`)
- ホスト: GitHub Pages

## ローカル開発

```bash
npm install
cp .env.example .env.local
# .env.local の VITE_GAS_URL を埋める
npm run dev
```

## デプロイ

```bash
# .env.production に本番 GAS URL を設定済みであること
npm run build
git add docs
git commit -m "Build docs"
git push
```

GitHub Pages の Source は **`main` ブランチ / `/docs` フォルダ** を指定。

## GAS セットアップ手順

1. スプシ `Z_タスク管理` を開く → 拡張機能 → Apps Script
2. `gas/Code.gs` の中身を貼り付けて保存
3. `setupUsersSheet()` を実行 → Users シート作成
4. `bulkRegisterUsers()` のパスワードを書き換えてから実行 → 3人を登録
5. デプロイ → 新しいデプロイ → 種類: ウェブアプリ → アクセスできるユーザー: 全員 → デプロイ → URL取得
6. その URL を `.env.production` の `VITE_GAS_URL` に設定して再ビルド

## パスワード変更

GAS エディタで `resetUserPassword('keita', '新パスワード')` を実行。
