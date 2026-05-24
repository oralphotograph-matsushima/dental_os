#!/bin/bash

# OralNote Clean Reinstallation Script for macOS

echo "============================================="
echo "  OralNote クリーンアップ & 再インストール準備 (Mac用)"
echo "============================================="
echo ""

# 1. 競合プロセスの強制終了
echo "[1/3] 競合するバックグラウンドプロセスを終了しています..."

# 実行中の OralNote プロセスを終了
pkill -f "OralNote" 2>/dev/null
pkill -f "electron" 2>/dev/null

# ポート 3000 と 3001 を占有しているプロセスを終了して競合を回避
PORT_3000_PID=$(lsof -t -i:3000 2>/dev/null)
if [ ! -z "$PORT_3000_PID" ]; then
  echo "  ポート 3000 を占有中のプロセス (PID: $PORT_3000_PID) を終了しています..."
  kill -9 $PORT_3000_PID 2>/dev/null
fi

PORT_3001_PID=$(lsof -t -i:3001 2>/dev/null)
if [ ! -z "$PORT_3001_PID" ]; then
  echo "  ポート 3001 を占有中のプロセス (PID: $PORT_3001_PID) を終了しています..."
  kill -9 $PORT_3001_PID 2>/dev/null
fi

# 2. キャッシュ・プログラムファイルの安全な削除
echo ""
echo "[2/3] アプリ本体の残骸およびキャッシュデータを削除しています..."

TARGETS=(
  "$HOME/Library/Application Support/OralNote"
  "$HOME/Library/Application Support/dental-os-prototype"
  "$HOME/Library/Caches/com.oralnote.ai"
  "$HOME/Library/Caches/com.oralnote.ai.ShipIt"
)

for target in "${TARGETS[@]}"; do
  if [ -d "$target" ] || [ -f "$target" ]; then
    rm -rf "$target"
    echo "  削除成功: $target"
  else
    echo "  検出なし (スキップ): $target"
  fi
done

# 3. 大切なデータの保護確認
echo ""
echo "[3/3] 重要な臨床データの保護状況を確認しています..."
CLINICAL_DATA="$HOME/Desktop/OralNote_Data"
if [ -d "$CLINICAL_DATA" ]; then
  echo "  ✅ 検出成功: $CLINICAL_DATA"
  echo "  🛡️ カルテおよび画像データは完全に保護されています。(削除されていません)"
else
  echo "  ℹ️ フォルダなし: $CLINICAL_DATA (新規インストールと同等の状態です)"
fi

echo ""
echo "============================================="
echo "  クリーンアップが完了しました！"
echo "  これで新バージョンを安全にインストール・起動できます。"
echo "============================================="
echo ""
