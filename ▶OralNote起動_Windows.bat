@echo off
chcp 65001 > nul
title Oral Note AI
echo ======================================
echo     Oral Note AI 起動スクリプト
echo ======================================

cd /d "%~dp0"

echo サーバーを起動しています...（数秒お待ちください）

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [エラー] Node.jsがインストールされていません。
    echo https://nodejs.org/ からインストールしてください。
    pause
    exit /b
)

if not exist node_modules\ (
    echo 初回セットアップを行っています...
    npm install
)

echo 起動完了！iPadでブラウザを開き、メインPCのIPアドレス（ポート3000）にアクセスしてください。
npm run dev:all
pause
