# OralNote Clean Reinstallation Script
# Supported OS: Windows 10 / 11
# Runs with Administrative Privileges

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Wireless Connect クリーンアップ & 再インストール準備" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. 競合プロセスの強制終了
Write-Host "[1/3] 競合するバックグラウンドプロセスを終了しています..." -ForegroundColor Yellow
$processes = @("Wireless Connect", "OralNote", "EOS Utility", "EOS Utility 3", "EOSWebService", "Wireless Transmitter Utility")
foreach ($proc in $processes) {
    try {
        Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
        Write-Host "  プロセス終了: $proc" -ForegroundColor Gray
    } catch {
        # スキップ
    }
}

# 2. キャッシュ・プログラムファイルの安全な削除
Write-Host ""
Write-Host "[2/3] アプリ本体の残骸およびキャッシュデータを削除しています..." -ForegroundColor Yellow

$userProfile = $env:USERPROFILE
$appData = $env:APPDATA
$localAppData = $env:LOCALAPPDATA
$programFiles = $env:ProgramFiles
$programFilesX86 = ${env:ProgramFiles(x86)}

$targets = @(
    (Join-Path $programFiles "Wireless Connect"),
    (Join-Path $programFiles "OralNote"),
    (Join-Path $programFilesX86 "Wireless Connect"),
    (Join-Path $programFilesX86 "OralNote"),
    (Join-Path $appData "Wireless Connect"),
    (Join-Path $appData "OralNote"),
    (Join-Path $appData "dental-os-prototype"),
    (Join-Path $localAppData "Programs\Wireless Connect"),
    (Join-Path $localAppData "Programs\OralNote"),
    (Join-Path $localAppData "wireless-connect-updater"),
    (Join-Path $localAppData "oralnote-updater"),
    (Join-Path $env:TEMP "wireless-connect-updater"),
    (Join-Path $env:TEMP "oralnote-updater")
)

foreach ($target in $targets) {
    if ($target -and (Test-Path $target)) {
        try {
            Remove-Item -Path $target -Recurse -Force -ErrorAction Stop
            Write-Host "  削除成功: $target" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️ 削除失敗 (使用中か権限不足): $target" -ForegroundColor Red
        }
    } else {
        # 検出なしはスキップ
    }
}

# ショートカットのクリーンアップ
$desktopLocations = @(
    [Environment]::GetFolderPath("Desktop"),
    "C:\Users\Public\Desktop",
    (Join-Path $env:USERPROFILE "Desktop"),
    (Join-Path $env:USERPROFILE "OneDrive\Desktop")
)
if (Test-Path $env:USERPROFILE) {
    Get-ChildItem -Path $env:USERPROFILE -Filter "OneDrive*" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $desktopLocations += Join-Path $_.FullName "Desktop"
    }
}

foreach ($dir in ($desktopLocations | Select-Object -Unique)) {
    if ($dir -and (Test-Path $dir)) {
        $lnk = Join-Path $dir "OralNote.lnk"
        if (Test-Path $lnk) {
            Remove-Item $lnk -Force -ErrorAction SilentlyContinue
            Write-Host "  デスクトップショートカット削除: $lnk" -ForegroundColor Green
        }
    }
}

$startMenuLnk = Join-Path $appData "Microsoft\Windows\Start Menu\Programs\OralNote.lnk"
if (Test-Path $startMenuLnk) {
    Remove-Item $startMenuLnk -Force -ErrorAction SilentlyContinue
    Write-Host "  スタートメニューショートカット削除: $startMenuLnk" -ForegroundColor Green
}

# 3. レジストリのクリーンアップ (アンインストール情報の削除)
Write-Host ""
Write-Host "[3/3] Windows レジストリから古いインストール情報を削除しています..." -ForegroundColor Yellow

$registryPaths = @(
    # Current User Uninstall Entries
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\com.oralnote.ai",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\OralNote",
    "HKCU:\Software\com.oralnote.ai",
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run\com.oralnote.ai",
    
    # Machine Uninstall Entries (64-bit)
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\com.oralnote.ai",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\OralNote",
    "HKLM:\Software\com.oralnote.ai",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run\com.oralnote.ai",

    # Machine Uninstall Entries (32-bit/WOW64)
    "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\com.oralnote.ai",
    "HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\OralNote",
    "HKLM:\Software\Wow6432Node\com.oralnote.ai"
)

foreach ($regPath in $registryPaths) {
    if (Test-Path $regPath) {
        try {
            Remove-Item -Path $regPath -Recurse -Force -ErrorAction Stop
            Write-Host "  レジストリ削除成功: $regPath" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️ レジストリ削除失敗: $regPath" -ForegroundColor Red
        }
    }
}

# 4. 大切なデータの保護確認
Write-Host ""
Write-Host "重要な臨床データの保護状況を確認しています..." -ForegroundColor Yellow

$patientDataFound = $false
$patientDataLocations = @(
    (Join-Path ([Environment]::GetFolderPath("Desktop")) "WirelessConnect_Data"),
    (Join-Path $env:USERPROFILE "Desktop\WirelessConnect_Data"),
    "C:\Users\Public\Desktop\WirelessConnect_Data",
    (Join-Path $env:USERPROFILE "OneDrive\Desktop\WirelessConnect_Data"),
    (Join-Path ([Environment]::GetFolderPath("Desktop")) "OralNote_Data"),
    (Join-Path $env:USERPROFILE "Desktop\OralNote_Data"),
    "C:\Users\Public\Desktop\OralNote_Data",
    (Join-Path $env:USERPROFILE "OneDrive\Desktop\OralNote_Data")
)
if (Test-Path $env:USERPROFILE) {
    Get-ChildItem -Path $env:USERPROFILE -Filter "OneDrive*" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $patientDataLocations += Join-Path $_.FullName "Desktop\WirelessConnect_Data"
        $patientDataLocations += Join-Path $_.FullName "Desktop\OralNote_Data"
    }
}

foreach ($loc in ($patientDataLocations | Select-Object -Unique)) {
    if ($loc -and (Test-Path $loc)) {
        Write-Host "  ✅ 検出成功: $loc" -ForegroundColor Green
        $patientDataFound = $true
    }
}

if ($patientDataFound) {
    Write-Host "  🛡️ カルテおよび画像データは完全に保護されています。(削除されていません)" -ForegroundColor Green
} else {
    Write-Host "  ℹ️ 保存データフォルダは検出されませんでした。(新規インストールと同等の状態です)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  クリーンアップが完了しました！" -ForegroundColor Cyan
Write-Host "  これで新バージョンを安全にインストールできます。" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "何かキーを押すと終了します..." -ForegroundColor Gray
Read-Host
