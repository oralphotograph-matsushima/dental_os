# OralNote Clean Reinstallation Script
# Supported OS: Windows 10 / 11

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  OralNote クリーンアップ & 再インストール準備" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. 競合プロセスの強制終了
Write-Host "[1/3] 競合するバックグラウンドプロセスを終了しています..." -ForegroundColor Yellow
$processes = @("OralNote", "node", "EOS Utility", "EOS Utility 3", "EOSWebService", "Wireless Transmitter Utility")
foreach ($proc in $processes) {
    try {
        Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
        Write-Host "  プロセス終了: $proc" -ForegroundColor Gray
    } catch {
        # プロセスが走っていなければスキップ
    }
}

# 2. キャッシュ・プログラムファイルの安全な削除
Write-Host ""
Write-Host "[2/3] アプリ本体の残骸およびキャッシュデータを削除しています..." -ForegroundColor Yellow

$userProfile = $env:USERPROFILE
$appData = $env:APPDATA
$localAppData = $env:LOCALAPPDATA

$targets = @(
    (Join-Path $appData "OralNote"),                   # Electron AppData
    (Join-Path $appData "dental-os-prototype"),       # 旧プロトタイプ AppData
    (Join-Path $localAppData "Programs\OralNote"),     # インストール本体
    (Join-Path $localAppData "oralnote-updater"),      # 自動アップデートキャッシュ
    (Join-Path $env:TEMP "oralnote-updater")           # 一時フォルダ
)

foreach ($target in $targets) {
    if (Test-Path $target) {
        try {
            Remove-Item -Path $target -Recurse -Force -ErrorAction Stop
            Write-Host "  削除成功: $target" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️ 削除失敗 (使用中か権限不足): $target" -ForegroundColor Red
        }
    } else {
        Write-Host "  検出なし (スキップ): $target" -ForegroundColor Gray
    }
}

# ショートカットのクリーンアップ
$desktopLnk = Join-Path ([Environment]::GetFolderPath("Desktop")) "OralNote.lnk"
if (Test-Path $desktopLnk) {
    Remove-Item $desktopLnk -Force -ErrorAction SilentlyContinue
    Write-Host "  デスクトップショートカット削除: $desktopLnk" -ForegroundColor Green
}

$startMenuLnk = Join-Path $appData "Microsoft\Windows\Start Menu\Programs\OralNote.lnk"
if (Test-Path $startMenuLnk) {
    Remove-Item $startMenuLnk -Force -ErrorAction SilentlyContinue
    Write-Host "  スタートメニューショートカット削除: $startMenuLnk" -ForegroundColor Green
}

# 3. 大切なデータの保護確認
Write-Host ""
Write-Host "[3/3] 重要な臨床データの保護状況を確認しています..." -ForegroundColor Yellow
$patientDataPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "OralNote_Data"
if (Test-Path $patientDataPath) {
    Write-Host "  ✅ 検出成功: $patientDataPath" -ForegroundColor Green
    Write-Host "  🛡️ カルテおよび画像データは完全に保護されています。(削除されていません)" -ForegroundColor Green
} else {
    Write-Host "  ℹ️ フォルダなし: $patientDataPath (新規インストールと同等の状態です)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  クリーンアップが完了しました！" -ForegroundColor Cyan
Write-Host "  これで新バージョンを安全にインストールできます。" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "何かキーを押すと終了します..." -ForegroundColor Gray
Read-Host
