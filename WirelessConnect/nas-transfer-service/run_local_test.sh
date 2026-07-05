#!/bin/bash

# ====================================================================
#  OralNote Wireless Connect 2.0 - ローカル検証自動環境構築スクリプト
# ====================================================================

# 色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    OralNote NAS Transfer 2.0 ローカル検証スタート  ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Python 3 の存在確認
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ エラー: Python 3 がシステムに見つかりません。${NC}"
    echo -e "インストールしてから再度実行してください。"
    exit 1
fi
echo -e "${GREEN}✓ Python 3 を検出しました。${NC}"

# 2. 仮想環境 (venv) の構築
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚙️ Python 仮想環境 (venv) を作成しています...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ エラー: 仮想環境の作成に失敗しました。${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Python 仮想環境が準備できました。${NC}"

# 3. 仮想環境のアクティベート
source venv/bin/activate
echo -e "${GREEN}✓ 仮想環境をアクティベートしました。${NC}"

# 4. 依存ライブラリのインストール
echo -e "${YELLOW}📦 必要なパッケージをインストールしています (数秒かかります)...${NC}"
pip install --upgrade pip -q
pip install -r requirements.txt -q
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ エラー: パッケージのインストールに失敗しました。${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 依存パッケージのインストールが完了しました。${NC}"

# Macの場合、Homebrewでzbarが入っていないとpyzbarが警告・エラーを出す可能性があります。
# その場合はOpenCVフォールバックが効きますが、警告を出すか自動で案内します。
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! brew list zbar &>/dev/null && ! command -v brew &>/dev/null; then
        echo -e "${YELLOW}⚠️ お知らせ: Macで高精度なQRデコード(pyzbar)を行うには、Homebrewで zbar のインストールを推奨します。${NC}"
        echo -e "  (未インストールでも、OpenCVによるセカンドデコーダーが自動動作しますのでテストは可能です)"
        echo -e "  インストールする場合: brew install zbar"
    fi
fi

# 5. テスト用ディレクトリの自動作成
echo -e "${YELLOW}📁 テスト用疑似フォルダを作成しています...${NC}"
mkdir -p inbox
mkdir -p data/Patients
mkdir -p data/Unassigned
mkdir -p config

echo -e "${GREEN}✓ 以下のテスト用ディレクトリを準備しました:${NC}"
echo -e "  - 受信監視フォルダ: ${BLUE}$(pwd)/inbox${NC} (ここに写真をドラッグ＆ドロップ)"
echo -e "  - データ保存フォルダ: ${BLUE}$(pwd)/data${NC} ( Patients/ や Unassigned/ を格納)"
echo -e "  - 設定フォルダ: ${BLUE}$(pwd)/config${NC}"

# 6. アプリケーションの起動
echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}  🎉 準備が整いました！自動振り分けサービスを起動します。${NC}"
echo -e "  1. ブラウザを開き、次のURLにアクセスしてください:"
echo -e "     ${YELLOW}http://localhost:8080${NC}"
echo -e "  2. 同時に入力した ${BLUE}inbox${NC} フォルダに写真を投入して動作をご確認ください。"
echo -e "  3. 終了するにはターミナルで ${RED}Ctrl + C${NC} を押してください。"
echo -e "${GREEN}====================================================${NC}\n"

# 環境変数をローカル用に明示設定して起動
export WATCH_DIR=inbox
export DATA_DIR=data
export CONFIG_PATH=config/config.json

python3 main.py
