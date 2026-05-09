#!/bin/bash
echo "======================================"
echo "    Oral Note AI 起動スクリプト"
echo "======================================"

# スクリプトがあるディレクトリに移動
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "サーバーを起動しています...（数秒お待ちください）"

# Node.jsがインストールされているか確認
if ! command -v npm &> /dev/null
then
    echo "エラー: Node.jsがインストールされていません。"
    echo "https://nodejs.org/ からインストールしてください。"
    read -p "Press any key to exit..."
    exit
fi

# パッケージのインストールチェック
if [ ! -d "node_modules" ]; then
    echo "初回セットアップを行っています..."
    npm install
fi

# サーバー起動（別ウィンドウで開くか、ここで開くか。今回は同じウィンドウ）
echo "起動完了！iPadでブラウザを開き、メインPCのIPアドレス（ポート3000）にアクセスしてください。"
npm run dev:all
