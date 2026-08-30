const express = require('express');
const cors = require('cors');
const { FtpSrv } = require('ftp-srv');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const os = require('os');
const exifParser = require('exif-parser');
const multer = require('multer');
const upload = multer({ dest: os.tmpdir() });

// Load .env.local
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

function migrateDataDirectoryName() {
  try {
    const desktop = getDesktopPath();
    const oldDir = path.join(desktop, 'OralNote_Data');
    const newDir = path.join(desktop, 'WirelessConnect_Data');
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
      console.log(`[Watcher Migration] Migrating folder from ${oldDir} to ${newDir}`);
      fs.renameSync(oldDir, newDir);
    }
  } catch (e) {
    console.error('[Watcher Migration] Failed to migrate folder:', e);
  }
}

// 起動時に移行処理を自動実行
migrateDataDirectoryName();

function getDefaultSettingsDir() {
  const desktop = getDesktopPath();
  const defaultDir = path.join(desktop, 'WirelessConnect_Data', 'Settings');
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
let activePatientId = null; // 手動設定された患者ID

// --- アポ表（スケジュール）管理ステート ---
let currentSchedule = []; // Array of { id, name, startTime, timestampMs }

function getScheduleFilePath() {
  return path.join(getDefaultSettingsDir(), 'today_schedule.json');
}

function loadSchedule() {
  const p = getScheduleFilePath();
  if (fs.existsSync(p)) {
    try {
      currentSchedule = JSON.parse(fs.readFileSync(p, 'utf8'));
      console.log(`[Schedule] 📅 Loaded today's schedule with ${currentSchedule.length} patients.`);
    } catch (e) {
      console.error('[Schedule] Failed to load schedule:', e);
      currentSchedule = [];
    }
  }
}

function saveSchedule() {
  const p = getScheduleFilePath();
  fs.writeFileSync(p, JSON.stringify(currentSchedule, null, 2));
}

// 画像のEXIF時刻を取得する関数
function getExifTime(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    if (result && result.tags && result.tags.DateTimeOriginal) {
      return result.tags.DateTimeOriginal * 1000; 
    }
  } catch (e) {
    // EXIFがない、または読めない場合は無視
  }
  return null;
}

// ファイル処理キュー（非同期の競合を防ぐため）
const processingQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  
  while (processingQueue.length > 0) {
    const filePath = processingQueue.shift();
    await handleNewFile(filePath);
  }
  
  isProcessing = false;
}

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
    : path.join(getDesktopPath(), 'WirelessConnect_Data', 'Patients');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getUnassignedDir() {
  const vaultPath = getVaultPath();
  const dir = vaultPath 
    ? path.join(vaultPath, 'Unassigned')
    : path.join(getDesktopPath(), 'WirelessConnect_Data', 'Unassigned');
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
loadSchedule();

// SSE接続クライアントの管理
let clients = [];
const sendToClients = (data) => {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
};

// 画像フォルダをWeb経由で直接アクセスできるようにする
app.use('/images', (req, res, next) => {
  express.static(getPatientsDir())(req, res, next);
});

app.use('/unassigned-images', (req, res, next) => {
  express.static(getUnassignedDir())(req, res, next);
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

// ==========================================
// 3.5. スケジュール & バッチソート API
// ==========================================

app.get('/api/schedule', (req, res) => {
  res.json({ schedule: currentSchedule });
});

app.post('/api/schedule', (req, res) => {
  const { schedule } = req.body;
  if (Array.isArray(schedule)) {
    currentSchedule = schedule;
    saveSchedule();
    res.json({ success: true, schedule: currentSchedule });
  } else {
    res.status(400).json({ success: false, error: 'Invalid schedule data' });
  }
});

app.post('/api/schedule/parse', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image uploaded' });
  }

  try {
    const base64Image = fs.readFileSync(req.file.path).toString('base64');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "この歯科予約表の画像から、全ての患者の予約情報を抽出してください。結果は必ずJSON配列で返してください。フォーマット: [{ \"id\": \"カルテ番号(数字のみ3〜8桁)\", \"name\": \"氏名(カタカナのみ)\", \"startTime\": \"HH:MM形式の時間\" }]\n\n条件：\n- 氏名は漢字・ひらがながある場合も「カタカナのみ（姓のみ、または姓名フル）」に変換すること。\n- 1人の患者につき1つのオブジェクトを作成すること。\n- 必ずJSONの配列のみを出力し、マークダウン(```json)やその他のテキストは一切含めないこと。" },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ],
        }
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });

    let text = response.choices[0].message.content.trim();
    // マークダウンのコードブロックがついていた場合の除去
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    console.log('[Schedule Parse] OpenAI Output:', text);
    const parsedData = JSON.parse(text);

    const parsedSchedule = [];
    const now = new Date();

    for (const item of parsedData) {
      if (item.startTime && item.id && item.name) {
        const [h, m] = item.startTime.split(':').map(Number);
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
        
        parsedSchedule.push({
          id: item.id.padStart(4, '0'),
          name: item.name,
          startTime: item.startTime,
          timestampMs: date.getTime()
        });
      }
    }

    parsedSchedule.sort((a, b) => a.timestampMs - b.timestampMs);
    res.json({ success: true, schedule: parsedSchedule, rawText: text });
  } catch (error) {
    console.error('[Schedule Parse] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

app.get('/api/batch-preview', (req, res) => {
  if (currentSchedule.length === 0) {
    return res.status(400).json({ success: false, error: 'No schedule available for sorting' });
  }

  const unassignedDir = getUnassignedDir();
  if (!fs.existsSync(unassignedDir)) {
    return res.json({ success: true, preview: [] });
  }

  const files = fs.readdirSync(unassignedDir);
  const preview = [];

  for (const file of files) {
    if (file.startsWith('.')) continue;
    const srcPath = path.join(unassignedDir, file);
    
    try {
      const stat = fs.statSync(srcPath);
      if (!stat.isFile()) continue;

      const ext = path.extname(file).toLowerCase();
      if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

      const exifTime = getExifTime(srcPath) || stat.mtimeMs;
      let targetPatient = null;
      let status = 'unknown';
      
      for (let i = 0; i < currentSchedule.length; i++) {
        const slot = currentSchedule[i];
        const nextSlot = currentSchedule[i + 1];
        
        const slotStartMs = slot.timestampMs - (15 * 60 * 1000); 
        const slotEndMs = nextSlot ? (nextSlot.timestampMs - (15 * 60 * 1000)) : (slot.timestampMs + (60 * 60 * 1000));

        if (exifTime >= slotStartMs && exifTime < slotEndMs) {
          targetPatient = `${slot.id}_${slot.name}`;
          status = 'match';
          break;
        }
      }

      preview.push({
        fileName: file,
        targetPatient,
        status,
        timestamp: exifTime
      });
    } catch (fileErr) {
      console.error(`[Batch-Preview] Error processing ${file}:`, fileErr);
    }
  }

  res.json({ success: true, preview });
});

app.post('/api/batch-execute', (req, res) => {
  const { mappings } = req.body; // Array of { fileName, targetPatient }
  if (!Array.isArray(mappings)) {
    return res.status(400).json({ success: false, error: 'Invalid mappings data' });
  }

  const unassignedDir = getUnassignedDir();
  let movedCount = 0;

  for (const mapping of mappings) {
    if (!mapping.targetPatient || mapping.targetPatient === 'ignore') continue;

    const srcPath = path.join(unassignedDir, mapping.fileName);
    if (!fs.existsSync(srcPath)) continue;

    const targetDir = path.join(getPatientsDir(), mapping.targetPatient);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, mapping.fileName);
    try {
      fs.renameSync(srcPath, targetPath);
      movedCount++;
      console.log(`[Batch-Execute] 🔄 Moved ${mapping.fileName} to ${mapping.targetPatient}`);
    } catch (err) {
      console.error(`[Batch-Execute] Error moving ${mapping.fileName}:`, err);
    }
  }

  if (movedCount > 0) {
    sendToClients({ type: 'REFRESH_IMAGES', patientId: 'all' });
  }

  res.json({ success: true, moved: movedCount });
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
  processingQueue.push(filePath);
  processQueue();
});

async function handleNewFile(filePath) {
  const fileName = path.basename(filePath);
  
  let targetDir;
  let targetPatientId = null;

  if (activePatientId) {
    // 手動で設定されている場合は最優先
    targetPatientId = activePatientId;
  } else {
    // スケジュール駆動のため、リアルタイムの振り分けは行わずすべてUnassignedに入れる
    // 拡張子チェック (画像かどうか)
    const ext = path.extname(fileName).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png'].includes(ext);

    if (!isImage) {
      console.log(`[Watcher] ⚠️ Not an image. Routing to unassigned.`);
    }
  }

  if (targetPatientId) {
    targetDir = path.join(getPatientsDir(), targetPatientId);
  } else {
    targetDir = getUnassignedDir();
    console.log(`[Watcher] 📥 File placed in Unassigned for batch sorting: ${fileName}`);
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, fileName);

  try {
    fs.renameSync(filePath, targetPath);
    console.log(`[Watcher] ✅ File moved to: ${targetDir}`);
    sendToClients({ type: 'NEW_IMAGE', fileName, patientId: targetPatientId || 'unassigned' });
  } catch (err) {
    console.error(`[Watcher] ❌ Error moving file:`, err);
  }
}

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
