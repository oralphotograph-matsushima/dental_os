import os
import sys
import logging
import uvicorn
from src.config import ConfigManager
from src.sorter import FileSorter
from src.watcher import DirectoryWatcher
from src.web.app import get_fastapi_app

# ログ設定の初期化
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("nas-transfer")

def main():
    logger.info("====================================================")
    logger.info("  Starting OralNote Wireless Connect NAS Sorter 2.0  ")
    logger.info("====================================================")

    # 1. パスの決定 (環境変数またはローカルデフォルト)
    watch_dir = os.environ.get("WATCH_DIR", "inbox")
    data_dir = os.environ.get("DATA_DIR", "data")
    
    # 相対パスは絶対パスに変換
    watch_dir = os.path.abspath(watch_dir)
    data_dir = os.path.abspath(data_dir)

    logger.info(f"Monitoring inbox directory: {watch_dir}")
    logger.info(f"Target data directory     : {data_dir}")

    # 監視・保存先フォルダの存在確認・自動作成
    os.makedirs(watch_dir, exist_ok=True)
    os.makedirs(data_dir, exist_ok=True)

    # 2. コアマネージャーの初期化
    config_manager = ConfigManager()
    sorter = FileSorter(config_manager, data_dir=data_dir)
    
    # 3. フォルダ監視スレッドの開始
    watcher = DirectoryWatcher(watch_dir, sorter)
    watcher.start()

    # 4. FastAPI アプリの初期化
    app = get_fastapi_app(config_manager, sorter)

    # 5. Webサーバーの起動 (ブロッキング処理)
    host = "0.0.0.0"
    port = 8080
    logger.info(f"Web Dashboard starting on http://{host}:{port}")
    
    try:
        uvicorn.run(app, host=host, port=port, log_level="warning")
    except KeyboardInterrupt:
        logger.info("Shutting down servers...")
    finally:
        # クリーンアップ
        watcher.stop()
        logger.info("NAS Sorter stopped gracefully.")

if __name__ == "__main__":
    main()
