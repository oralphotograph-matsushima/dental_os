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
app.use(express.json({ limit: '40mb' }));

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
      console.log(`[Schedule] Loaded today's schedule with ${currentSchedule.length} patients.`);
    } catch (e) {
      console.error('[Schedule] Failed to load schedule:', e);
      currentSchedule = [];
    }
  }
}

function getClinicConfig() {
  const defaultPath = path.join(getDefaultSettingsDir(), 'clinic.json');
  let config = {};
  try {
    if (fs.existsSync(defaultPath)) {
      config = JSON.parse(fs.readFileSync(defaultPath, 'utf8')) || {};
    }
  } catch (e) {
    console.error('[Watcher] Failed to read clinic.json:', e);
  }
  if (config.vaultPath) {
    const customPath = path.join(config.vaultPath, 'Settings', 'clinic.json');
    try {
      if (fs.existsSync(customPath)) {
        const custom = JSON.parse(fs.readFileSync(customPath, 'utf8')) || {};
        config = { ...config, ...custom };
      }
    } catch (e) {
      console.error('[Watcher] Failed to read vault clinic.json:', e);
    }
  }
  return config;
}

function isAutoSortEnabled() {
  return getClinicConfig().autoSortEnabled === true;
}

function loadTodayQueue() {
  const candidates = [];
  const vault = getVaultPath();
  if (vault) candidates.push(path.join(vault, 'Settings', 'queue.json'));
  candidates.push(path.join(getDefaultSettingsDir(), 'queue.json'));

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.error('[Watcher] Failed to read queue.json:', e);
    }
  }
  return [];
}

function getAssignmentTargets() {
  const byId = new Map();

  for (const slot of currentSchedule) {
    if (!slot || slot.id == null) continue;
    const id = String(slot.id);
    byId.set(id, {
      id,
      name: slot.name || id,
      folder: findExistingPatientFolder(id) || `${id}_${slot.name || id}`,
      startTime: slot.startTime || '',
      source: 'schedule'
    });
  }

  for (const p of loadTodayQueue()) {
    if (!p || p.id == null) continue;
    const id = String(p.id);
    if (byId.has(id)) continue;
    const folder = findExistingPatientFolder(id)
      || (p.name && String(p.name).includes('_') ? String(p.name) : id);
    byId.set(id, {
      id,
      name: p.name || id,
      folder,
      startTime: '',
      source: 'queue'
    });
  }

  return Array.from(byId.values());
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

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png'];

function isInboxImageFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return IMAGE_EXTS.includes(ext) && !fileName.startsWith('.');
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

/** フォルダ名・表示名から患者番号だけ取り出す（名前のOCRゆれは無視） */
function extractPatientNumber(raw) {
  if (raw == null || raw === '') return '';
  return String(raw).trim().split('_')[0].trim();
}

function findExistingPatientFolder(patientNumber) {
  const id = extractPatientNumber(patientNumber);
  if (!id) return null;
  const patientsDir = getPatientsDir();
  if (!fs.existsSync(patientsDir)) return null;
  let dirs = [];
  try {
    dirs = fs.readdirSync(patientsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    return null;
  }
  const exact = dirs.filter((e) => e.name === id);
  const prefixed = dirs.filter((e) => e.name.startsWith(`${id}_`));
  const pickNewest = (list) => {
    const sorted = [...list].sort((a, b) => {
      try {
        const sa = fs.statSync(path.join(patientsDir, a.name));
        const sb = fs.statSync(path.join(patientsDir, b.name));
        return sb.mtimeMs - sa.mtimeMs;
      } catch {
        return 0;
      }
    });
    return sorted[0] ? sorted[0].name : null;
  };
  const named = pickNewest(prefixed);
  if (named) {
    if (exact[0]) mergePatientFolderInto(exact[0].name, named);
    return named;
  }
  return pickNewest(exact);
}

function mergePatientFolderInto(fromName, toName) {
  if (!fromName || !toName || fromName === toName) return;
  const patientsDir = getPatientsDir();
  const fromDir = path.join(patientsDir, fromName);
  const toDir = path.join(patientsDir, toName);
  if (!fs.existsSync(fromDir) || !fs.existsSync(toDir)) return;
  try {
    for (const file of fs.readdirSync(fromDir)) {
      const src = path.join(fromDir, file);
      if (!fs.statSync(src).isFile()) continue;
      let destName = file;
      let dest = path.join(toDir, destName);
      if (fs.existsSync(dest)) {
        destName = `${Date.now()}_${file}`;
        dest = path.join(toDir, destName);
      }
      fs.renameSync(src, dest);
    }
    fs.rmdirSync(fromDir);
    console.log(`[Watcher] Merged leftover folder ${fromName} → ${toName}`);
  } catch (e) {
    console.error(`[Watcher] Failed to merge ${fromName} into ${toName}:`, e);
  }
}

function preferredFolderName(raw, patientName) {
  const id = extractPatientNumber(raw);
  if (!id) return null;
  let namePart = '';
  if (patientName) {
    const n = String(patientName).trim();
    namePart = n.includes('_') ? n.split('_').slice(1).join('_') : n;
  } else if (String(raw).includes('_')) {
    namePart = String(raw).split('_').slice(1).join('_');
  }
  return namePart ? `${id}_${namePart}` : id;
}

/** 番号が同じなら既存フォルダを優先。なければ id_名前 を返す（まだ作らない） */
function resolvePatientFolder(raw, patientName) {
  const id = extractPatientNumber(raw);
  if (!id) return null;
  return findExistingPatientFolder(id) || preferredFolderName(raw, patientName);
}

function ensurePatientFolder(raw, patientName) {
  const folder = resolvePatientFolder(raw, patientName);
  if (!folder) return null;
  const targetDir = path.join(getPatientsDir(), folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`[API] ✅ Created directory: ${targetDir}`);
  }
  return folder;
}

function getLegacyUnassignedDir() {
  const vaultPath = getVaultPath();
  return vaultPath
    ? path.join(vaultPath, 'Unassigned')
    : path.join(getDesktopPath(), 'WirelessConnect_Data', 'Unassigned');
}

/** 旧 Unassigned に残った写真を Patients 直下へ一度だけ移し、空ならフォルダを消す */
function migrateUnassignedIntoPatients() {
  const oldDir = getLegacyUnassignedDir();
  if (!fs.existsSync(oldDir)) return;

  const patientsDir = getPatientsDir();
  try {
    const entries = fs.readdirSync(oldDir);
    for (const file of entries) {
      if (file.startsWith('.')) continue;
      const srcPath = path.join(oldDir, file);
      if (!fs.statSync(srcPath).isFile()) continue;
      const destPath = path.join(patientsDir, file);
      if (fs.existsSync(destPath)) {
        const stamp = Date.now();
        fs.renameSync(srcPath, path.join(patientsDir, `${stamp}_${file}`));
      } else {
        fs.renameSync(srcPath, destPath);
      }
      console.log(`[Watcher Migration] Moved leftover inbox photo to Patients/: ${file}`);
    }
    const leftover = fs.readdirSync(oldDir).filter(f => !f.startsWith('.'));
    if (leftover.length === 0) {
      fs.rmSync(oldDir, { recursive: true, force: true });
      console.log('[Watcher Migration] Removed empty Unassigned folder');
    }
  } catch (e) {
    console.error('[Watcher Migration] Failed to migrate Unassigned into Patients:', e);
  }
}

function matchSchedulePatient(exifTime) {
  if (!currentSchedule.length) return null;
  for (let i = 0; i < currentSchedule.length; i++) {
    const slot = currentSchedule[i];
    const nextSlot = currentSchedule[i + 1];
    const slotStartMs = slot.timestampMs - (15 * 60 * 1000);
    const slotEndMs = nextSlot
      ? (nextSlot.timestampMs - (15 * 60 * 1000))
      : (slot.timestampMs + (60 * 60 * 1000));
    if (exifTime >= slotStartMs && exifTime < slotEndMs) {
      return resolvePatientFolder(`${slot.id}_${slot.name}`);
    }
  }
  return null;
}

function listInboxPhotos() {
  const patientsDir = getPatientsDir();
  if (!fs.existsSync(patientsDir)) return [];
  return fs.readdirSync(patientsDir).filter((file) => {
    if (!isInboxImageFile(file)) return false;
    const fullPath = path.join(patientsDir, file);
    try {
      return fs.statSync(fullPath).isFile();
    } catch {
      return false;
    }
  });
}

function autoSortInboxIfScheduled() {
  if (!currentSchedule.length) return;
  const patientsDir = getPatientsDir();
  let moved = 0;
  for (const file of listInboxPhotos()) {
    const srcPath = path.join(patientsDir, file);
    try {
      const stat = fs.statSync(srcPath);
      const match = matchSchedulePatient(getExifTime(srcPath) || stat.mtimeMs);
      if (!match) continue;
      const targetDir = path.join(patientsDir, match);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      let destName = file;
      let destPath = path.join(targetDir, destName);
      if (fs.existsSync(destPath)) {
        destName = `${Date.now()}_${file}`;
        destPath = path.join(targetDir, destName);
      }
      fs.renameSync(srcPath, destPath);
      moved++;
      console.log(`[Watcher] Startup sort: ${file} -> ${match}`);
    } catch (e) {
      console.error(`[Watcher] Startup sort failed for ${file}:`, e);
    }
  }
  if (moved > 0) {
    console.log(`[Watcher] Startup sort moved ${moved} inbox photo(s) into patient folders`);
  }
}

// 初期化時に必要なディレクトリを作成
if (!fs.existsSync(STAGING_DIR)) {
  fs.mkdirSync(STAGING_DIR, { recursive: true });
}

function pruneEmptyPatientFolders() {
  const patientsDir = getPatientsDir();
  if (!fs.existsSync(patientsDir)) return;
  for (const name of fs.readdirSync(patientsDir)) {
    const full = path.join(patientsDir, name);
    try {
      if (!fs.statSync(full).isDirectory()) continue;
      const files = fs.readdirSync(full).filter((f) => !f.startsWith('.'));
      const meaningful = files.filter((f) => f !== 'layout.json');
      if (meaningful.length === 0) {
        fs.rmSync(full, { recursive: true, force: true });
        console.log(`[Watcher] Removed empty patient folder: ${name}`);
      }
    } catch (e) {
      console.error(`[Watcher] Failed to prune ${name}:`, e);
    }
  }
}

getPatientsDir();
migrateUnassignedIntoPatients();
pruneEmptyPatientFolders();
loadSchedule();
if (isAutoSortEnabled()) {
  autoSortInboxIfScheduled();
}

// SSE接続クライアントの管理
let clients = [];
const sendToClients = (data) => {
  clients.forEach(client => client.res.write(`data: ${JSON.stringify(data)}\n\n`));
};

// 画像フォルダをWeb経由で直接アクセスできるようにする
app.use('/images', (req, res, next) => {
  express.static(getPatientsDir())(req, res, next);
});

// 旧UI互換。未振り分け写真は Patients 直下にある
app.use('/unassigned-images', (req, res, next) => {
  express.static(getPatientsDir())(req, res, next);
});
app.use('/inbox-images', (req, res, next) => {
  express.static(getPatientsDir())(req, res, next);
});

// ==========================================
// 3. APIサーバー (Express - iPad等からの操作用)
// ==========================================
app.get('/api/patient', (req, res) => {
  res.json({ activePatientId });
});

app.post('/api/patient', (req, res) => {
  const { patientId, patientName } = req.body;
  if (!patientId) {
    activePatientId = null;
    console.log(`[API] 🧑‍⚕️ Active patient cleared`);
    return res.json({ success: true, activePatientId: null });
  }

  activePatientId = resolvePatientFolder(patientId, patientName);
  const exists = !!(activePatientId && findExistingPatientFolder(activePatientId));
  console.log(`[API] 🧑‍⚕️ Active patient set to: ${activePatientId || 'None'} (id=${extractPatientNumber(patientId)}, folder ${exists ? 'exists' : 'will be created on first photo or chart'})`);
  res.json({
    success: true,
    activePatientId,
    patientNumber: extractPatientNumber(patientId),
    folderExists: exists
  });
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

app.get('/api/assignment-targets', (req, res) => {
  res.json({
    targets: getAssignmentTargets(),
    autoSortEnabled: isAutoSortEnabled()
  });
});

app.get('/api/batch-preview', (req, res) => {
  const patientsDir = getPatientsDir();
  const files = listInboxPhotos();
  const preview = [];

  for (const file of files) {
    const srcPath = path.join(patientsDir, file);
    
    try {
      const stat = fs.statSync(srcPath);
      const exifTime = getExifTime(srcPath) || stat.mtimeMs;
      const targetPatient = matchSchedulePatient(exifTime);

      preview.push({
        fileName: file,
        targetPatient: targetPatient || '',
        status: targetPatient ? 'match' : 'unknown',
        timestamp: exifTime
      });
    } catch (fileErr) {
      console.error(`[Batch-Preview] Error processing ${file}:`, fileErr);
    }
  }

  res.json({
    success: true,
    preview,
    targets: getAssignmentTargets(),
    autoSortEnabled: isAutoSortEnabled()
  });
});

app.post('/api/batch-execute', (req, res) => {
  const { mappings } = req.body; // Array of { fileName, targetPatient }
  if (!Array.isArray(mappings)) {
    return res.status(400).json({ success: false, error: 'Invalid mappings data' });
  }

  const patientsDir = getPatientsDir();
  let movedCount = 0;

  for (const mapping of mappings) {
    if (!mapping.targetPatient || mapping.targetPatient === 'ignore' || mapping.targetPatient === '') continue;

    const srcPath = path.join(patientsDir, mapping.fileName);
    if (!fs.existsSync(srcPath) || !fs.statSync(srcPath).isFile()) continue;

    const folder = ensurePatientFolder(mapping.targetPatient);
    if (!folder) continue;
    const targetDir = path.join(patientsDir, folder);

    let destName = mapping.fileName;
    let targetPath = path.join(targetDir, destName);
    if (fs.existsSync(targetPath)) {
      destName = `${Date.now()}_${mapping.fileName}`;
      targetPath = path.join(targetDir, destName);
    }
    try {
      fs.renameSync(srcPath, targetPath);
      movedCount++;
      console.log(`[Batch-Execute] Moved ${mapping.fileName} to ${folder}`);
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
  const folder = findExistingPatientFolder(req.params.id) || req.params.id;
  const patientDir = path.join(getPatientsDir(), folder);
  if (!fs.existsSync(patientDir) || !fs.statSync(patientDir).isDirectory()) {
    return res.json({ images: [], folder: null });
  }
  const files = fs.readdirSync(patientDir)
    .filter(f => {
      if (f.startsWith('.')) return false;
      if (f === 'layout.json') return false;
      if (!IMAGE_EXTS.includes(path.extname(f).toLowerCase())) return false;
      try {
        return fs.statSync(path.join(patientDir, f)).isFile();
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      // 新しいものが先頭に来るようにソート（更新日時）
      const statA = fs.statSync(path.join(patientDir, a));
      const statB = fs.statSync(path.join(patientDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
  res.json({ images: files, folder });
});

app.get('/api/patients/:id/layout', (req, res) => {
  const folder = findExistingPatientFolder(req.params.id) || req.params.id;
  const layoutPath = path.join(getPatientsDir(), folder, 'layout.json');
  if (!fs.existsSync(layoutPath)) {
    return res.json({ slots: null });
  }
  try {
    const data = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
    res.json(data);
  } catch {
    res.json({ slots: null });
  }
});

app.post('/api/patients/:id/export-png', (req, res) => {
  const folder = findExistingPatientFolder(req.params.id) || req.params.id;
  const patientDir = path.join(getPatientsDir(), folder);
  if (!fs.existsSync(patientDir)) {
    return res.status(404).json({ error: '患者フォルダがありません' });
  }

  const files = Array.isArray(req.body?.files) ? req.body.files : [];
  if (files.length === 0 && req.body?.filename && req.body?.dataUrl) {
    files.push({ filename: req.body.filename, dataUrl: req.body.dataUrl });
  }
  if (files.length === 0) {
    return res.status(400).json({ error: '保存する画像がありません' });
  }

  const saved = [];
  for (const item of files) {
    if (!item || !item.filename || !item.dataUrl) continue;
    const safeName = path.basename(String(item.filename)).replace(/[^\w.\u3040-\u30ff\u4e00-\u9fff_-]/g, '_');
    if (!safeName.toLowerCase().endsWith('.png')) continue;
    const match = String(item.dataUrl).match(/^data:image\/png;base64,(.+)$/);
    if (!match) continue;
    const dest = path.join(patientDir, safeName);
    fs.writeFileSync(dest, Buffer.from(match[1], 'base64'));
    saved.push(safeName);
    sendToClients({ type: 'NEW_IMAGE', fileName: safeName, patientId: folder });
  }

  res.json({ success: true, saved });
});

app.post('/api/patients/:id/layout', (req, res) => {
  const folder = findExistingPatientFolder(req.params.id) || req.params.id;
  const patientDir = path.join(getPatientsDir(), folder);
  if (!fs.existsSync(patientDir)) {
    return res.status(404).json({ error: '患者フォルダがありません' });
  }
  const layoutPath = path.join(patientDir, 'layout.json');
  const payload = {
    updatedAt: new Date().toISOString(),
    format: req.body.format || '7',
    confirmed: req.body.confirmed === true,
    slots: req.body.slots || []
  };
  fs.writeFileSync(layoutPath, JSON.stringify(payload, null, 2));
  sendToClients({ type: 'REFRESH_IMAGES', patientId: folder });
  res.json({ success: true });
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
  const patientsDir = getPatientsDir();
  let targetPatientId = activePatientId || null;

  if (targetPatientId) {
    const resolved = resolvePatientFolder(targetPatientId);
    if (resolved) {
      targetPatientId = resolved;
      activePatientId = resolved;
    }
  }

  if (
    !targetPatientId &&
    isAutoSortEnabled() &&
    isInboxImageFile(fileName) &&
    currentSchedule.length > 0
  ) {
    try {
      const stat = fs.statSync(filePath);
      const exifTime = getExifTime(filePath) || stat.mtimeMs;
      targetPatientId = matchSchedulePatient(exifTime);
    } catch (e) {
      console.error('[Watcher] Failed to read EXIF for schedule match:', e);
    }
  }

  const targetDir = targetPatientId
    ? path.join(patientsDir, targetPatientId)
    : patientsDir;

  if (targetPatientId && !fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`[Watcher] Created patient folder on first photo: ${targetDir}`);
  }

  let destName = fileName;
  let targetPath = path.join(targetDir, destName);
  if (fs.existsSync(targetPath)) {
    destName = `${Date.now()}_${fileName}`;
    targetPath = path.join(targetDir, destName);
  }

  try {
    fs.renameSync(filePath, targetPath);
    if (targetPatientId) {
      console.log(`[Watcher] File moved to patient folder: ${targetPatientId}/${destName}`);
    } else {
      console.log(`[Watcher] File parked in Patients/ inbox for later sort: ${destName}`);
    }
    sendToClients({ type: 'NEW_IMAGE', fileName: destName, patientId: targetPatientId || 'inbox' });
  } catch (err) {
    console.error(`[Watcher] Error moving file:`, err);
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
