import os
import shutil
import time
import logging
from datetime import datetime
import pykakasi
from src.qr_decoder import decode_qr_code

logger = logging.getLogger("nas-transfer")

class FileSorter:
    def __init__(self, config_manager, data_dir=None):
        self.config = config_manager
        self.data_dir = data_dir or os.environ.get("DATA_DIR", "data")
        self.patients_dir = os.path.join(self.data_dir, "Patients")
        self.unassigned_dir = os.path.join(self.data_dir, "Unassigned")
        
        # 必要なフォルダの初期作成
        for d in [self.patients_dir, self.unassigned_dir]:
            os.makedirs(d, exist_ok=True)

        # pykakasi の初期化
        self.kks = pykakasi.kakasi()
        # ソートイベント用のコールバック
        self.on_event_callback = None

    def register_callback(self, callback):
        """
        Webダッシュボードへのリアルタイム通知用コールバックを登録
        """
        self.on_event_callback = callback

    def trigger_event(self, event_type, message, data=None):
        if self.on_event_callback:
            try:
                self.on_event_callback(event_type, message, data)
            except Exception as e:
                logger.error(f"Callback error: {e}")

    def convert_to_katakana_last_name(self, name_text: str) -> str:
        """
        Katakana-Only Anonymization Rule (Rule 3) に準拠し、
        漢字やひらがな混じりの氏名をカタカナの名字に変換する。
        例: '山田 太郎' -> 'ヤマダ', '佐藤美香' -> 'サトウ'
        """
        if not name_text:
            return ""
        
        # スペース（全角・半角）で区切られている場合は名字の部分を取り出す
        parts = name_text.replace("　", " ").split(" ")
        last_name_raw = parts[0] if parts else name_text

        try:
            result = self.kks.convert(last_name_raw)
            # 各形態素のカタカナ(kana)を結合
            katakana_last_name = "".join([item['kana'] for item in result])
            # 全角カタカナに整形（半角カタカナの変換防止）
            return katakana_last_name.strip()
        except Exception as e:
            logger.error(f"Failed to convert name to Katakana: {e}")
            # エラー時は安全のために記号を除去した元の文字を返す
            return "".join(c for c in last_name_raw if c.isalnum())

    def wait_for_file_stable(self, file_path: str, timeout: int = 15, interval: float = 0.5) -> bool:
        """
        カメラからNASへの写真転送が完全に完了する（ファイルサイズが安定する）のを待機する。
        """
        last_size = -1
        start_time = time.time()
        
        logger.debug(f"Waiting for file to be fully written: {file_path}")
        
        while time.time() - start_time < timeout:
            if not os.path.exists(file_path):
                return False
            try:
                current_size = os.path.getsize(file_path)
                # ファイルサイズが変化しておらず、かつ0バイトより大きい場合に書き込み完了とみなす
                if current_size == last_size and current_size > 0:
                    # 実際に読み込み可能かオープン確認
                    with open(file_path, 'rb') as f:
                        pass
                    logger.debug(f"File stable. Size: {current_size} bytes")
                    return True
                last_size = current_size
            except (OSError, PermissionError) as e:
                # 書き込み中のため開けない場合などはスルー
                logger.debug(f"File locked or changing: {e}")
            
            time.sleep(interval)
            
        logger.warning(f"File did not stabilize within timeout ({timeout}s): {file_path}")
        return False

    def process_file(self, file_path: str):
        """
        受信した新規ファイルを処理し、QRコード判定および適切なフォルダへの振り分けを行う。
        """
        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()

        # 画像ファイル以外は無視
        if ext not in ['.jpg', '.jpeg', '.png', '.cr2', '.nef']:
            logger.debug(f"Ignoring non-image file: {filename}")
            return

        # ファイル書き込み完了を待つ
        if not self.wait_for_file_stable(file_path):
            self.trigger_event("ERROR", f"ファイルの転送タイムアウト: {filename}")
            return

        self.trigger_event("SCANNING", f"画像をスキャン中...: {filename}", {"filename": filename})

        # QRコードの検出・デコードを試みる
        decoded_text = decode_qr_code(file_path)
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")

        if decoded_text:
            # ----------------------------------------------------
            # QRコード検出：新しい患者のトリガー
            # ----------------------------------------------------
            logger.info(f"QR Code detected: {decoded_text}")
            
            # QRコードのパース (例: "12345_山田太郎" または "12345")
            patient_id = decoded_text
            patient_name = ""
            
            if "_" in decoded_text:
                parts = decoded_text.split("_", 1)
                patient_id = parts[0].strip()
                raw_name = parts[1].strip()
                # カタカナ名字に変換
                patient_name = self.convert_to_katakana_last_name(raw_name)
            elif "-" in decoded_text:
                parts = decoded_text.split("-", 1)
                patient_id = parts[0].strip()
                raw_name = parts[1].strip()
                patient_name = self.convert_to_katakana_last_name(raw_name)
            
            # アクティブ患者を更新
            # もし名前が取れていれば「ID_カタカナ名」のフォルダ命名規則とする
            folder_name = f"{patient_id}_{patient_name}" if patient_name else patient_id
            
            # カタカナのみの氏名・フォルダ規則を徹底する (Rule 3)
            self.config.set_active_patient(patient_id, patient_name)
            
            # 患者用フォルダの作成
            dest_folder = os.path.join(self.patients_dir, folder_name)
            os.makedirs(dest_folder, exist_ok=True)
            
            # QRコード写真自体も記録として患者フォルダへ保存 (00_qr_trigger_XXX.jpg)
            dest_filename = f"00_qr_trigger_{timestamp_str}{ext}"
            dest_path = os.path.join(dest_folder, dest_filename)
            
            try:
                shutil.move(file_path, dest_path)
                logger.info(f"QR trigger photo moved to: {dest_path}")
                self.config.add_recent_photo(dest_filename, folder_name, timestamp_str)
                self.trigger_event("QR_DETECTED", f"QRコード検出！撮影アクティブに設定: {folder_name}", {
                    "patient_id": patient_id,
                    "patient_name": patient_name,
                    "folder_name": folder_name,
                    "filename": dest_filename
                })
            except Exception as e:
                logger.error(f"Failed to move QR trigger photo: {e}")
                self.trigger_event("ERROR", f"QR写真の移動失敗: {filename}")
                
        else:
            # ----------------------------------------------------
            # QRコード未検出：口腔内写真の振り分け
            # ----------------------------------------------------
            active_id = self.config.active_patient_id
            active_name = self.config.active_patient_name
            
            if active_id:
                # アクティブ患者あり -> その患者のフォルダへ
                folder_name = f"{active_id}_{active_name}" if active_name else active_id
                dest_folder = os.path.join(self.patients_dir, folder_name)
                os.makedirs(dest_folder, exist_ok=True)
                
                # 同名ファイル衝突を避けるためタイムスタンプを付与
                dest_filename = f"{timestamp_str}_{filename}"
                dest_path = os.path.join(dest_folder, dest_filename)
                
                try:
                    shutil.move(file_path, dest_path)
                    logger.info(f"Oral photo sorted to patient [{folder_name}]: {dest_filename}")
                    self.config.add_recent_photo(dest_filename, folder_name, timestamp_str)
                    self.trigger_event("SORTED", f"画像を {folder_name} へ自動振り分けしました", {
                        "patient_id": active_id,
                        "folder_name": folder_name,
                        "filename": dest_filename
                    })
                except Exception as e:
                    logger.error(f"Failed to move oral photo to patient folder: {e}")
                    self.trigger_event("ERROR", f"画像の移動失敗: {filename}")
            else:
                # アクティブ患者なし -> 未分類フォルダへ
                dest_filename = f"{timestamp_str}_{filename}"
                dest_path = os.path.join(self.unassigned_dir, dest_filename)
                
                try:
                    shutil.move(file_path, dest_path)
                    logger.info(f"No active patient. Photo routed to Unassigned: {dest_filename}")
                    self.config.add_recent_photo(dest_filename, "Unassigned", timestamp_str)
                    self.trigger_event("UNASSIGNED", f"撮影患者が未選択のため、未分類フォルダへ退避しました", {
                        "patient_id": "Unassigned",
                        "folder_name": "Unassigned",
                        "filename": dest_filename
                    })
                except Exception as e:
                    logger.error(f"Failed to move photo to Unassigned: {e}")
                    self.trigger_event("ERROR", f"未分類画像の移動失敗: {filename}")
