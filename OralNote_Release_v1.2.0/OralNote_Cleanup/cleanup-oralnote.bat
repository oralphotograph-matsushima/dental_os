@echo off
title OralNote Cleanup Tool
chcp 65001 > nul

echo ====================================================
echo  OralNote クリーンアップツール (Windows用)
echo ====================================================
echo.
echo このツールは、インストール不具合を引き起こす古いアプリ残骸、
echo キャッシュ、および競合プロセスを安全にクリーンアップします。
echo ※カルテや画像などの重要データは絶対に削除されません。
echo.
echo 実行にはPowerShellスクリプトを使用します。
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\cleanup-oralnote.ps1"

echo.
echo 処理が完了しました。ウィンドウを閉じます。
pause
