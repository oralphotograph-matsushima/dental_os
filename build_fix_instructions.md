# OralNote v1.3.6 起動不具合（Next.js スタンドアロンビルドバグ）の対策手順

**※注意：このファイルが置かれているこのPCが「メイン開発PC（ビルド実行PC）」です。**

開発PCにおいて、バージョン v1.3.6 以上のパッケージング（ビルド）を行う際、製品版で起動直後にクラッシュする不具合を防止するための恒久的な対策手順と実績の記録です。

---

## 1. 不具合の概要と原因
Next.js 16+（およびTurbopack）を使用して `next build` を実行する際、Next.jsの静的依存関係解析機能（`@vercel/nft`）が、APIルートの実行に必要な一部のコンパイル済ランタイムファイル（`app-route-turbo.runtime.prod.js` など）をスタンドアロン出力フォルダ（`.next/standalone`）内の `node_modules` にコピーし忘れるバグが存在します。

これにより、パッケージされた製品版アプリ（ASAR）内でNext.jsサーバーが `Cannot find module '...app-route-turbo.runtime.prod.js'` エラーを引き起こし、クリニックのPCで起動直後にクラッシュしていました。

---

## 2. 開発PC（本環境）での対策・適用済みの変更

本開発PCにおいて、以下のファイルに恒久的な修正を適用完了しています。

### ① ビルドスクリプトの修正
* **対象ファイル：** [build-electron.js](file:///Users/matsuchannel/Desktop/Antigravity/OralNote/scripts/build-electron.js)
* **適用内容：** `.next/standalone` ディレクトリが生成された後、`node_modules/next/dist/compiled/next-server` 内のすべてのコンパイル済みランタイムファイル（計29ファイル）を、スタンドアロン側の該当フォルダへ自動コピーするロジックを挿入しました。これにより、コピー漏れによる製品版の起動クラッシュを自動で防ぎます。

### ② ビルドハングアップ対策の適用
* **Tailwind v4 の最適化：** [globals.css](file:///Users/matsuchannel/Desktop/Antigravity/OralNote/src/app/globals.css) の `@import "tailwindcss"` を `@import "tailwindcss" source(none);` に変更し、スキャン対象を `src` フォルダのみに限定。巨大なビルド成果物 `dist` フォルダなどをスキャンしてPostCSSがフリーズする問題を解消しました。
* **TypeScriptの除外設定：** [tsconfig.json](file:///Users/matsuchannel/Desktop/Antigravity/OralNote/tsconfig.json) に `"dist"` および `".next/standalone"` を `exclude` として追加。
* **Webpackビルドワーカーの設定：** [next.config.ts](file:///Users/matsuchannel/Desktop/Antigravity/OralNote/next.config.ts) で `webpackBuildWorker: false` を指定。

---

## 3. 不要なビルド成果物のクリーンアップ（実施済み）
本開発PCのファイル数が肥大化していたため、以下の不要な過去の巨大ビルドデータを削除し、ディスク容量の開放およびスキャン処理の効率化を行いました。
* 過去の古いインストーラー (`dist/OralNote*1.3.4*`、`dist/OralNote*1.3.5*` など)
* 古い一時解凍フォルダ (`dist/win-unpacked` フォルダ)

これにより、`dist` ディレクトリが完全にクリーンアップされ、ビルドパフォーマンスが向上しました。
