import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * 旧フォルダ名 OralNote_Data が存在し、新フォルダ名 WirelessConnect_Data が存在しない場合、
 * 自動的にフォルダ名を変更（マイグレーション）してデータを引き継ぎます。
 */
export const migrateDataDirectoryName = () => {
  try {
    const homedir = os.homedir();
    // デスクトップパスの特定ロジック（getDesktopPathのインライン展開）
    let desktop = path.join(homedir, 'Desktop');
    if (process.platform === 'win32') {
      const pathsToCheck = [
        path.join(homedir, 'OneDrive', 'Desktop'),
        path.join(homedir, 'OneDrive', 'デスクトップ'),
        path.join(homedir, 'Desktop')
      ];
      for (const p of pathsToCheck) {
        if (fs.existsSync(p)) {
          desktop = p;
          break;
        }
      }
    }
    
    const oldDir = path.join(desktop, 'OralNote_Data');
    const newDir = path.join(desktop, 'WirelessConnect_Data');
    
    if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
      console.log(`[Migration] Migrating data folder name from ${oldDir} to ${newDir}`);
      fs.renameSync(oldDir, newDir);
      console.log('[Migration] Folder migrated successfully.');
    }
  } catch (e) {
    console.error('[Migration] Failed to migrate folder name:', e);
  }
};

// モジュール読み込み時に自動で移行処理を走らせる
migrateDataDirectoryName();

/**
 * OneDrive等の同期フォルダが有効な場合に備え、存在する正しいデスクトップパスを特定して返します。
 */
export const getDesktopPath = (): string => {
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
};

/**
 * デフォルトのデータ保存ルート (Desktop/WirelessConnect_Data) を取得します。
 */
export const getDefaultDataDir = (): string => {
  return path.join(getDesktopPath(), 'WirelessConnect_Data');
};

/**
 * デフォルトの設定保存ディレクトリ (Desktop/WirelessConnect_Data/Settings) を取得します。
 */
export const getDefaultSettingsDir = (): string => {
  const defaultDir = path.join(getDefaultDataDir(), 'Settings');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
};

/**
 * 実際に使うデータルート。clinic.json の vaultPath があればそちら、なければ WirelessConnect_Data。
 */
export const getVaultBaseDir = (): string => {
  const defaultDir = getDefaultSettingsDir();
  const defaultClinicJson = path.join(defaultDir, 'clinic.json');

  if (fs.existsSync(defaultClinicJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(defaultClinicJson, 'utf8'));
      if (data && data.vaultPath) {
        return data.vaultPath;
      }
    } catch (e) {
      console.error('[SettingsHelper] Failed to read clinic.json for vaultPath in getVaultBaseDir:', e);
    }
  }
  return getDefaultDataDir();
};

/**
 * ユーザー指定のカルテ保存先（vaultPath）の設定フォルダ、またはデフォルトの設定フォルダを取得します。
 */
export const getSettingsDir = (): string => {
  const defaultDir = getDefaultSettingsDir();
  const defaultClinicJson = path.join(defaultDir, 'clinic.json');

  if (fs.existsSync(defaultClinicJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(defaultClinicJson, 'utf8'));
      if (data && data.vaultPath) {
        const customDir = path.join(data.vaultPath, 'Settings');
        if (!fs.existsSync(customDir)) {
          fs.mkdirSync(customDir, { recursive: true });
        }
        return customDir;
      }
    } catch (e) {
      console.error('[SettingsHelper] Failed to read clinic.json for vaultPath:', e);
    }
  }
  return defaultDir;
};

export const getClinicSettingsPath = (): string => {
  return path.join(getSettingsDir(), 'clinic.json');
};

export const getLabsSettingsPath = (): string => {
  return path.join(getSettingsDir(), 'labs.json');
};

export const getTermsSettingsPath = (): string => {
  return path.join(getSettingsDir(), 'terms.json');
};

/**
 * 技工指示書データの保存先ディレクトリ (vaultPath/TechnicianOrders) を取得します。
 */
export const getOrdersDir = (): string => {
  const ordersDir = path.join(getVaultBaseDir(), 'TechnicianOrders');
  if (!fs.existsSync(ordersDir)) {
    fs.mkdirSync(ordersDir, { recursive: true });
  }
  return ordersDir;
};

/**
 * 保存先フォルダが変更された場合に、既存の設定ファイルを自動的にお引越し（コピー）します。
 */
export const migrateSettings = (newVaultPath: string) => {
  if (!newVaultPath) return;

  const oldDir = getSettingsDir();
  const newDir = path.join(newVaultPath, 'Settings');

  if (path.resolve(oldDir) === path.resolve(newDir)) {
    return; // 同一フォルダの場合は何もしない
  }

  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }

  const filesToMigrate = ['labs.json', 'terms.json', 'clinic.json'];
  for (const file of filesToMigrate) {
    const oldFile = path.join(oldDir, file);
    const newFile = path.join(newDir, file);

    if (fs.existsSync(oldFile)) {
      try {
        if (file === 'clinic.json') {
          // clinic.json は新しい vaultPath を適用して保存する
          const data = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
          data.vaultPath = newVaultPath;
          fs.writeFileSync(newFile, JSON.stringify(data, null, 2), 'utf8');
        } else {
          fs.copyFileSync(oldFile, newFile);
        }
        console.log(`[SettingsHelper] Migrated setting: ${file} to ${newDir}`);
      } catch (e) {
        console.error(`[SettingsHelper] Failed to migrate setting file: ${file}`, e);
      }
    }
  }
};

/**
 * 医院基本設定を保存します。変更された場合はお引越し（移行）処理も行います。
 */
export const saveClinicSettingsData = (data: any) => {
  const defaultDir = getDefaultSettingsDir();
  const defaultFile = path.join(defaultDir, 'clinic.json');

  if (data && data.vaultPath) {
    // 移行処理の実施
    migrateSettings(data.vaultPath);
  }

  const activeFile = getClinicSettingsPath();
  fs.writeFileSync(activeFile, JSON.stringify(data, null, 2), 'utf8');

  // カスタムフォルダに保存した場合でも、アプリ起動時の読み出しポインタ用に、
  // デスクトップ側のデフォルト clinic.json にも vaultPath 情報のみを記録しておく
  if (path.resolve(activeFile) !== path.resolve(defaultFile)) {
    const pointerData = { vaultPath: data.vaultPath };
    fs.writeFileSync(defaultFile, JSON.stringify(pointerData, null, 2), 'utf8');
  }
};
