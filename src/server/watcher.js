const express = require('express');
const cors = require('cors');
const { FtpSrv } = require('ftp-srv');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const os = require('os');

function getDesktopPath() {
  const homedir = os.homedir();
  if (process.platform === 'win32') {
    const pathsToCheck = [
      path.join(homedir, 'OneDrive', 'Desktop'),
      path.join(homedir, 'OneDrive', 'デスクトップ'),
      path.join(homedir, 'Desktop')
    ];
    for (const p of pathsToCheck) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }
  return path.join(homedir, 'Desktop');
}

function getDefaultSettingsDir() {
  const desktop = getDesktopPath();
  const defaultDir = path.join(desktop, 'OralNote_Data', 'Settings');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

function getLocalIpAddress() {
  // まず clinic.json から手動IP設定があるかチェックする
  const defaultDir = getDefaultSettingsDir();
  const settingsFilePath = path.join(defaultDir, 'clinic.json');
  if (fs.existsSync(settingsFilePath)) {
    try {
      const config = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
      if (config && config.customIP) {
        console.log(`[Watcher] 🌐 Using custom IP from clinic.json: ${config.customIP}`);
        return config.customIP;
      }
    } catch (e) {
      console.error('[Watcher] Failed to parse clinic.json for customIP:', e);
    }
  }

  // なければ自動検出
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}
const localIp = getLocalIpAddress();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. 状態管理 (State)
// ==========================================
let activePatientId = null;

const homedir = os.homedir();
const STAGING_DIR = path.join(getDesktopPath(), 'EOS_Utility_Photos');

function getVaultPath() {
  const defaultDir = getDefaultSettingsDir();
  const settingsFilePath = path.join(defaultDir, 'clinic.json');
  if (fs.existsSync(settingsFilePath)) {
    try {
      const config = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
      if (config && config.vaultPath) {
        return config.vaultPath;
      }
    } catch (e) {
      console.error('[Watcher] Failed to parse clinic.json for vaultPath:', e);
    }
  }
  return '';
}

function getPatientsDir() {
  const vaultPath = getVaultPath();
  const dir = vaultPath 
    ? path.join(vaultPath, 'Patients')
    : path.join(getDesktopPath(), 'OralNote_Data', 'Patients');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getUnassignedDir() {
  const vaultPath = getVaultPath();
  const dir = vaultPath 
    ? path.join(vaultPath, 'Unassigned')
    : path.join(getDesktopPath(), 'OralNote_Data', 'Unassigned');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 初期化時に必要なディレクトリを作成
if (!fs.existsSync(STAGING_DIR)) {
  fs.mkdirSync(STAGING_DIR, { recursive: true });
}
getPatientsDir();
getUnassignedDir();

// SSE接続クライアントの管理
let clients = [];
const sendToClients = (data) => {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
};

// 画像フォルダをWeb経由で直接アクセスできるようにする
app.use('/images', (req, res, next) => {
  express.static(getPatientsDir())(req, res, next);
});

// ==========================================
// 3. APIサーバー (Express - iPad等からの操作用)
// ==========================================
app.get('/api/patient', (req, res) => {
  res.json({ activePatientId });
});

app.post('/api/patient', (req, res) => {
  const { patientId } = req.body;
  activePatientId = patientId || null;
  console.log(`[API] 🧑‍⚕️ Active patient set to: ${activePatientId || 'None'}`);
  
  if (activePatientId) {
    const targetDir = path.join(getPatientsDir(), activePatientId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`[API] ✅ Created directory: ${targetDir}`);
    }
  }
  
  res.json({ success: true, activePatientId });
});

app.get('/api/patients/:id/images', (req, res) => {
  const patientDir = path.join(getPatientsDir(), req.params.id);
  if (!fs.existsSync(patientDir)) {
    return res.json({ images: [] });
  }
  const files = fs.readdirSync(patientDir)
    .filter(f => !f.startsWith('.'))
    .sort((a, b) => {
      // 新しいものが先頭に来るようにソート（更新日時）
      const statA = fs.statSync(path.join(patientDir, a));
      const statB = fs.statSync(path.join(patientDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
  res.json({ images: files });
});

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  clients.push(newClient);
  console.log(`[SSE] 📡 Client connected (ID: ${clientId}). Total clients: ${clients.length}`);

  req.on('close', () => {
    console.log(`[SSE] 🔌 Client disconnected (ID: ${clientId})`);
    clients = clients.filter(client => client.id !== clientId);
  });
});

// ==========================================
// 4. FTPサーバー (ftp-srv - カメラからの受信用)
// ==========================================
const ftpPort = 2121;
const ftpServer = new FtpSrv({
  url: `ftp://0.0.0.0:${ftpPort}`,
  anonymous: true,
  pasv_url: localIp // 自動取得したIPアドレスを設定
});

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
  console.log(`[FTP] 📸 Camera connected.`);
  resolve({ root: STAGING_DIR });
});

ftpServer.listen().then(() => {
  console.log(`[FTP] 🚀 FTP server listening on port ${ftpPort}`);
});

// ==========================================
// 5. ファイル監視と自動振り分け (Chokidar)
// ==========================================
const watcher = chokidar.watch(STAGING_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100
  }
});

watcher.on('add', (filePath) => {
  console.log(`[Watcher] 📁 New file received: ${path.basename(filePath)}`);
  
  const fileName = path.basename(filePath);
  let targetDir;

  if (activePatientId) {
    targetDir = path.join(getPatientsDir(), activePatientId);
  } else {
    targetDir = getUnassignedDir();
    console.log(`[Watcher] ⚠️ No active patient. Routing to unassigned.`);
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, fileName);

  fs.rename(filePath, targetPath, (err) => {
    if (err) {
      console.error(`[Watcher] ❌ Error moving file:`, err);
    } else {
      console.log(`[Watcher] ✅ File moved to: ${targetDir}`);
      // 新しい画像が追加されたことをクライアントに通知
      sendToClients({ type: 'NEW_IMAGE', fileName, patientId: activePatientId || 'unassigned' });
    }
  });
});

// ==========================================
// 6. サーバー起動
// ==========================================
const httpPort = 3001; // Next.jsが3000を使うため、3001を使用
app.listen(httpPort, () => {
  console.log(`[HTTP] 🌐 Watcher API server listening on http://localhost:${httpPort}`);
  console.log(`====================================================`);
  console.log(` 🚀 iPadやスマートフォンからは以下のURLでアクセスしてください: `);
  console.log(`    http://${localIp}:3000`);
  console.log(`====================================================`);
});
