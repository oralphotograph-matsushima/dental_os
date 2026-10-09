const fs = require('fs-extra');
const path = require('path');

async function buildElectron() {
  const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
  const publicDir = path.join(__dirname, '..', 'public');
  const staticDir = path.join(__dirname, '..', '.next', 'static');
  
  console.log('Preparing standalone build for Electron...');

  if (!fs.existsSync(standaloneDir)) {
    console.error('Error: .next/standalone directory not found. Please run "next build" first.');
    process.exit(1);
  }

  // Copy public directory
  if (fs.existsSync(publicDir)) {
    console.log('Copying public directory...');
    await fs.copy(publicDir, path.join(standaloneDir, 'public'));
  }

  // Copy .next/static directory
  if (fs.existsSync(staticDir)) {
    console.log('Copying .next/static directory...');
    await fs.copy(staticDir, path.join(standaloneDir, '.next', 'static'));
  }

  // Copy .env.local if it exists
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envLocalPath)) {
    console.log('Copying .env.local to standalone...');
    await fs.copy(envLocalPath, path.join(standaloneDir, '.env'));
  }

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

  // Watcher 依存（ftp-srv 等）は Vercel 関数に載せない。Electron standalone へ明示コピーする。
  const watcherDeps = ['ftp-srv', 'chokidar', 'express', 'cors'];
  const nmRoot = path.join(__dirname, '..', 'node_modules');
  const standaloneNm = path.join(standaloneDir, 'node_modules');
  for (const dep of watcherDeps) {
    const src = path.join(nmRoot, dep);
    const dest = path.join(standaloneNm, dep);
    if (fs.existsSync(src)) {
      console.log(`Copying watcher dependency ${dep} into standalone...`);
      await fs.copy(src, dest);
    } else {
      console.warn(`Warning: node_modules/${dep} not found; skipped.`);
    }
  }

  // watcher.js 本体も standalone に含める（Electron から起動するため）
  const watcherSrc = path.join(__dirname, '..', 'src', 'server', 'watcher.js');
  const watcherDest = path.join(standaloneDir, 'src', 'server', 'watcher.js');
  if (fs.existsSync(watcherSrc)) {
    await fs.ensureDir(path.dirname(watcherDest));
    await fs.copy(watcherSrc, watcherDest);
  }

  console.log('Successfully prepared standalone build!');
}

buildElectron().catch(console.error);
