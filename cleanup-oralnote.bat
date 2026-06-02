@echo off
title OralNote Cleanup Tool
chcp 65001 > nul

echo ====================================================
echo  OralNote クリーンアップツール (Windows用)
echo ====================================================
echo.

:: 管理者権限の有無を確認
openfiles >nul 2>&1
if %errorlevel% neq 0 (
    echo 管理者権限が必要なため、自動的に昇格して実行します...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: バッチファイルのディレクトリに移動 (管理者権限で実行した際の作業ディレクトリ対策)
cd /d "%~dp0"

:: PowerShell スクリプトを実行
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\cleanup-oralnote.ps1"
