import os
import time
import logging
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

logger = logging.getLogger("nas-transfer")

class InboxHandler(FileSystemEventHandler):
    def __init__(self, sorter):
        self.sorter = sorter

    def on_created(self, event):
        if event.is_directory:
            return
        logger.debug(f"Watchdog detected file creation: {event.src_path}")
        # スレッドを介してソート処理を実行（I/Oブロック防止）
        threading.Thread(target=self.sorter.process_file, args=(event.src_path,), daemon=True).start()

    def on_moved(self, event):
        if event.is_directory:
            return
        logger.debug(f"Watchdog detected file move/rename: {event.dest_path}")
        threading.Thread(target=self.sorter.process_file, args=(event.dest_path,), daemon=True).start()


class DirectoryWatcher:
    def __init__(self, watch_dir, sorter, poll_interval=5.0):
        self.watch_dir = watch_dir
        self.sorter = sorter
        self.poll_interval = poll_interval
        
        self.observer = None
        self.polling_thread = None
        self.is_running = False

        # 監視対象ディレクトリの存在確認
        os.makedirs(self.watch_dir, exist_ok=True)

    def start(self):
        self.is_running = True
        logger.info(f"Starting Watcher service for: {self.watch_dir}")

        # 1. Watchdogの起動（リアルタイム検知）
        event_handler = InboxHandler(self.sorter)
        self.observer = Observer()
        self.observer.schedule(event_handler, self.watch_dir, recursive=False)
        self.observer.start()
        logger.info("Watchdog observer thread started successfully.")

        # 2. 定期ポーリングスレッドの起動 (NASマウント等のイベント検知漏れ対策)
        self.polling_thread = threading.Thread(target=self._poll_directory, daemon=True)
        self.polling_thread.start()
        logger.info(f"Polling fallback thread started. Interval: {self.poll_interval}s")

    def stop(self):
        self.is_running = False
        if self.observer:
            self.observer.stop()
            self.observer.join()
        logger.info("Watcher service stopped.")

    def _poll_directory(self):
        """
        定期的に監視フォルダ内をスキャンする。
        ファイルは処理成功後に別フォルダへ移動(move)されるため、
        フォルダ内に残っている画像はすべて「未処理」として安全に処理可能。
        """
        while self.is_running:
            try:
                if os.path.exists(self.watch_dir):
                    files = os.listdir(self.watch_dir)
                    for f in files:
                        file_path = os.path.join(self.watch_dir, f)
                        if os.path.isfile(file_path):
                            ext = os.path.splitext(f)[1].lower()
                            if ext in ['.jpg', '.jpeg', '.png', '.cr2', '.nef']:
                                logger.debug(f"Polling detected unprocessed file: {f}")
                                # 重複処理を防ぐため、sorter側でファイル存在確認とロック確認が行われます
                                threading.Thread(target=self.sorter.process_file, args=(file_path,), daemon=True).start()
            except Exception as e:
                logger.error(f"Error during directory polling: {e}")
                
            time.sleep(self.poll_interval)
