# OralNote v1.3.5 起動不具合（Next.js スタンドアロンビルドバグ）の対策手順

開発PCで次のバージョン（v1.3.6 など）をパッケージング（ビルド）する際に、同様の起動クラッシュ不具合が再発するのを防ぐための対策手順です。

---

## 1. 不具合の概要と原因
Next.js 16+（およびTurbopack）を使用して `next build` を実行する際、Next.jsの静的依存関係解析機能（`@vercel/nft`）が、APIルートの実行に必要な一部のコンパイル済ランタイムファイル（`app-route-turbo.runtime.prod.js` など）をスタンドアロン出力フォルダ（`.next/standalone`）内の `node_modules` にコピーし忘れるバグが存在します。

これにより、パッケージされた製品版アプリ（ASAR）内でNext.jsサーバーが `Cannot find module '...app-route-turbo.runtime.prod.js'` エラーを引き起こして即座にクラッシュしていました。

---

## 2. 開発PCでの対策方法（修正内容）
開発用のソースコード内にある、Electronビルド前処理スクリプト（通常 `scripts/build-electron.js`）を以下のように更新し、ビルド時に不足するランタイムファイルを強制的にコピーするようにします。

### 修正対象ファイル
* `scripts/build-electron.js` （またはこれに該当するビルドスクリプト）

### 修正内容（コードの書き換え例）
`buildElectron` 処理の中で、`.next/standalone` ディレクトリが生成された後、かつパッケージング（`asar` 圧縮や `electron-builder` の実行）が行われる前のタイミングに、以下のコードブロックを挿入します。

```javascript
const fs = require('fs-extra');
const path = require('path');

async function buildElectron() {
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
  
  // ... (既存のpublicや.next/staticディレクトリのコピー処理など) ...

  // ======================================================================
  // 【追加】Next.js 16+ Turbopack スタンドアロンビルド時の依存ファイルコピー漏れ対策
  // ======================================================================
  const sourceNextServerCompiledDir = path.join(
    __dirname,
    '..',
    'node_modules',
    'next',
    'dist',
    'compiled',
    'next-server'
  );
  const targetNextServerCompiledDir = path.join(
    standaloneDir,
    'node_modules',
    'next',
    'dist',
    'compiled',
    'next-server'
  );
  
  if (fs.existsSync(sourceNextServerCompiledDir)) {
    console.log('Copying missing Next.js compiled runtime files to standalone...');
    // 出力先のディレクトリを確保
    await fs.ensureDir(targetNextServerCompiledDir);
    // すべてのコンパイル済 .js ランタイムファイルを強制コピー
    const files = await fs.readdir(sourceNextServerCompiledDir);
    for (const file of files) {
      if (file.endsWith('.js')) {
        await fs.copy(
          path.join(sourceNextServerCompiledDir, file),
          path.join(targetNextServerCompiledDir, file)
        );
      }
    }
  }

  // ... (既存のビルド処理の続き) ...
  console.log('Successfully prepared standalone build!');
}

buildElectron().catch(console.error);
```

---

## 3. 動作確認方法
開発PCで上記スクリプトを適用したのち、通常通りパッケージング（インストーラーの作成）を行い、生成されたインストーラーを使用してクリーンインストールした環境で、アプリが起動することを確認してください。
