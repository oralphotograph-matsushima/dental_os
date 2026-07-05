const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { fork, exec } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow;
let nextServerProcess;
let watcherProcess;

function createWindow() {
  const isWindows = process.platform === 'win32';
  const iconPath = isWindows 
    ? path.join(__dirname, 'icon.ico')
    : path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // Next.jsサーバーが立ち上がるのを待ってからロードする
  checkServerReady(3000, () => {
    mainWindow.loadURL('http://localhost:3000');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function checkServerReady(port, cb, retries = 30) {
  if (retries === 0) {
    console.error('Server is not ready after multiple retries.');
    return;
  }
  const req = http.get(`http://localhost:${port}`, (res) => {
    if (res.statusCode === 200) {
      cb();
    } else {
      setTimeout(() => checkServerReady(port, cb, retries - 1), 1000);
    }
  });
  req.on('error', () => {
    setTimeout(() => checkServerReady(port, cb, retries - 1), 1000);
  });
}

function startServers() {
  // 開発環境と本番環境でパスが異なる
  const isProd = app.isPackaged;
  
  // Next.js standalone server path
  const nextStandaloneDir = isProd 
    ? path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone')
    : path.join(__dirname, '..', '.next', 'standalone');
  const nextServerPath = path.join(nextStandaloneDir, 'server.js');

  // Load .env if it exists
  const envFilePath = path.join(nextStandaloneDir, '.env');
  if (fs.existsSync(envFilePath)) {
    const envContent = fs.readFileSync(envFilePath, 'utf8');
    envContent.split('\n').forEach(line => {
      // Ignore comments and empty lines
      if (line.trim().startsWith('#') || !line.includes('=')) return;
      
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        // Remove \r, trim spaces, and strip surrounding double/single quotes
        let val = match[2].replace(/\r$/, '').trim();
        val = val.replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    });
    console.log('Loaded environment variables from .env');
  }

  console.log('Starting Next.js Server at:', nextServerPath);
  try {
    nextServerProcess = fork(nextServerPath, [], {
      execPath: process.execPath,
      cwd: nextStandaloneDir, // 明示的にカレントディレクトリを指定してサーバー自身の.env自動ロードを支援
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: '3000', HOSTNAME: '0.0.0.0' }
    });
    nextServerProcess.on('error', (err) => console.error('Next.js process error:', err));
  } catch (err) {
    console.error('Failed to start Next.js Server:', err);
  }

  console.log('Starting Watcher Server...');
  try {
    const watcherModulePath = isProd 
      ? path.join(process.resourcesPath, 'app.asar', 'src', 'server', 'watcher.js')
      : path.join(__dirname, '..', 'src', 'server', 'watcher.js');
    
    // Watcherは非同期のExpress/FTPサーバーなので、メインプロセスでそのままrequireして実行可能
    require(watcherModulePath);
    console.log('Watcher Server started successfully.');
  } catch (err) {
    console.error('Failed to start Watcher Server:', err);
  }
}

function launchCameraUtilities() {
  const isWindows = process.platform === 'win32';

  const utilities = [];

  if (isWindows) {
    utilities.push(
      '"C:\\Program Files (x86)\\Canon\\EOS Utility\\EOS Utility.exe"',
      '"C:\\Program Files (x86)\\Canon\\EOS Utility 3\\EOS Utility 3.exe"',
      '"C:\\Program Files\\Canon\\EOS Utility 3\\EOS Utility 3.exe"',
      '"C:\\Program Files\\Nikon\\Wireless Transmitter Utility\\Wireless Transmitter Utility.exe"'
    );
  }

  // 順番に実行を試み、存在すれば起動する（エラーは無視）
  for (const cmd of utilities) {
    exec(cmd, (error) => {
      if (!error) {
        console.log(`Successfully launched: ${cmd}`);
      }
    });
  }
}

app.whenReady().then(() => {
  startServers();
  createWindow();
  // launchCameraUtilities();

  // 自動アップデートチェック
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('quit', () => {
  // アプリ終了時にバックグラウンドプロセスをキルする
  if (nextServerProcess) nextServerProcess.kill();
  if (watcherProcess) watcherProcess.kill();
});

// 自動アップデート関連のイベントリスナー
autoUpdater.on('update-available', () => {
  console.log('Update available.');
});
autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'アップデート完了',
    message: '新しいバージョンがダウンロードされました。アプリを再起動して適用しますか？',
    buttons: ['再起動する', '後で']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
