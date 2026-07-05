import os
import json
import logging
import threading

logger = logging.getLogger("nas-transfer")

class ConfigManager:
    _lock = threading.Lock()

    def __init__(self):
        # CONFIG_PATH 環境変数、またはデフォルトのパス
        self.config_path = os.environ.get("CONFIG_PATH", os.path.join("config", "config.json"))
        self.config_dir = os.path.dirname(self.config_path)
        
        self.active_patient_id = None
        self.active_patient_name = None
        self.recent_photos = [] # 直近の振り分け写真履歴 [{"filename": str, "patient_id": str, "timestamp": str}]
        self.max_recent_photos = 20

        # ディレクトリ構成の自動作成
        if self.config_dir and not os.path.exists(self.config_dir):
            os.makedirs(self.config_dir, exist_ok=True)
            
        self.load()

    def load(self):
        with self._lock:
            if os.path.exists(self.config_path):
                try:
                    with open(self.config_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.active_patient_id = data.get("active_patient_id")
                        self.active_patient_name = data.get("active_patient_name")
                        self.recent_photos = data.get("recent_photos", [])
                        logger.info("Configuration successfully loaded.")
                except Exception as e:
                    logger.error(f"Failed to load config.json: {e}. Using defaults.")
            else:
                self.save_unlocked()

    def save(self):
        with self._lock:
            self.save_unlocked()

    def save_unlocked(self):
        data = {
            "active_patient_id": self.active_patient_id,
            "active_patient_name": self.active_patient_name,
            "recent_photos": self.recent_photos
        }
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save config.json: {e}")

    def set_active_patient(self, patient_id, name=None):
        self.active_patient_id = patient_id
        self.active_patient_name = name
        self.save()
        logger.info(f"Active patient set to: {patient_id} ({name or 'No Name'})")

    def clear_active_patient(self):
        self.active_patient_id = None
        self.active_patient_name = None
        self.save()
        logger.info("Active patient cleared.")

    def add_recent_photo(self, filename, patient_id, timestamp):
        with self._lock:
            # 重複チェック
            if any(p["filename"] == filename for p in self.recent_photos):
                return
            self.recent_photos.insert(0, {
                "filename": filename,
                "patient_id": patient_id,
                "timestamp": timestamp
            })
            # 件数制限
            if len(self.recent_photos) > self.max_recent_photos:
                self.recent_photos = self.recent_photos[:self.max_recent_photos]
        self.save()
