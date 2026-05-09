const express = require('express');
const cors = require('cors');
const { FtpSrv } = require('ftp-srv');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. 状態管理 (State)
// ==========================================
let activePatientId = null;

// ==========================================
// 2. ディレクトリ設定 (Directories)
// ==========================================
const homedir = require('os').homedir();
const FTP_STAGING_DIR = path.join(homedir, 'Desktop', 'Camera_Inbox');
const BASE_DATA_DIR = path.join(homedir, 'Desktop', 'OralNote_Data');
const PATIENTS_DIR = path.join(BASE_DATA_DIR, 'Patients');
const UNASSIGNED_DIR = path.join(BASE_DATA_DIR, 'Unassigned');

[FTP_STAGING_DIR, PATIENTS_DIR, UNASSIGNED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 画像フォルダをWeb経由で直接アクセスできるようにする
app.use('/images', express.static(PATIENTS_DIR));

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
  res.json({ success: true, activePatientId });
});

app.get('/api/patients/:id/images', (req, res) => {
  const patientDir = path.join(PATIENTS_DIR, req.params.id);
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

// ==========================================
// 4. FTPサーバー (ftp-srv - カメラからの受信用)
// ==========================================
const ftpPort = 2121;
const ftpServer = new FtpSrv({
  url: `ftp://0.0.0.0:${ftpPort}`,
  anonymous: true,
  pasv_url: '127.0.0.1' // ※本番環境ではWindowsマシンのIPアドレスにする必要があります
});

ftpServer.on('login', ({ connection, username, password }, resolve, reject) => {
  console.log(`[FTP] 📸 Camera connected.`);
  resolve({ root: FTP_STAGING_DIR });
});

ftpServer.listen().then(() => {
  console.log(`[FTP] 🚀 FTP server listening on port ${ftpPort}`);
});

// ==========================================
// 5. ファイル監視と自動振り分け (Chokidar)
// ==========================================
const watcher = chokidar.watch(FTP_STAGING_DIR, {
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
    targetDir = path.join(PATIENTS_DIR, activePatientId);
  } else {
    targetDir = UNASSIGNED_DIR;
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
    }
  });
});

// ==========================================
// 6. サーバー起動
// ==========================================
const httpPort = 3001; // Next.jsが3000を使うため、3001を使用
app.listen(httpPort, () => {
  console.log(`[HTTP] 🌐 Watcher API server listening on http://localhost:${httpPort}`);
});
