import os
import logging
import asyncio
from datetime import datetime
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger("nas-transfer")

# SSE送信用イベントキュー
event_queue = asyncio.Queue()

def get_fastapi_app(config_manager, sorter):
    app = FastAPI(title="OralNote NAS Transfer Dashboard", version="2.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 1. 画像フォルダをWeb経由でアクセス可能にする (ギャラリー表示用)
    patients_dir = os.path.join(sorter.data_dir, "Patients")
    unassigned_dir = os.path.join(sorter.data_dir, "Unassigned")
    
    app.mount("/images/patients", StaticFiles(directory=patients_dir), name="patients_images")
    app.mount("/images/unassigned", StaticFiles(directory=unassigned_dir), name="unassigned_images")

    # 2. ログイベントのコールバック登録
    def sorter_event_handler(event_type, message, data=None):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = {
            "time": timestamp,
            "type": event_type,
            "message": message,
            "data": data or {}
        }
        # 非同期イベントループにスケジュール
        asyncio.run_coroutine_threadsafe(event_queue.put(log_entry), asyncio.get_event_loop())

    sorter.register_callback(sorter_event_handler)

    # 3. テンプレート設定
    templates_dir = os.path.join(os.path.dirname(__file__), "templates")
    templates = Jinja2Templates(directory=templates_dir)

    # 4. モデル定義
    class PatientSelect(BaseModel):
        patient_id: str
        patient_name: str | None = None

    # ==========================================
    # API エンドポイント
    # ==========================================

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request):
        return templates.TemplateResponse("index.html", {
            "request": request,
            "active_patient_id": config_manager.active_patient_id,
            "active_patient_name": config_manager.active_patient_name,
            "recent_photos": config_manager.recent_photos
        })

    @app.get("/api/status")
    async def get_status():
        return {
            "active_patient_id": config_manager.active_patient_id,
            "active_patient_name": config_manager.active_patient_name,
            "recent_photos": config_manager.recent_photos,
            "inbox_path": sorter.data_dir
        }

    @app.post("/api/active-patient/set")
    async def set_active_patient(patient: PatientSelect):
        # カタカナ変換を適用
        katakana_name = sorter.convert_to_katakana_last_name(patient.patient_name) if patient.patient_name else ""
        config_manager.set_active_patient(patient.patient_id, katakana_name)
        
        folder_name = f"{patient.patient_id}_{katakana_name}" if katakana_name else patient.patient_id
        
        # フォルダ作成
        dest_folder = os.path.join(sorter.patients_dir, folder_name)
        os.makedirs(dest_folder, exist_ok=True)
        
        # イベント通知
        sorter_event_handler("SYSTEM", f"手動で撮影アクティブを設定しました: {folder_name}", {
            "patient_id": patient.patient_id,
            "patient_name": katakana_name,
            "folder_name": folder_name
        })
        return {"success": True, "active_patient_id": patient.patient_id, "active_patient_name": katakana_name}

    @app.post("/api/active-patient/clear")
    async def clear_active_patient():
        config_manager.clear_active_patient()
        sorter_event_handler("SYSTEM", "手動で撮影アクティブを解除しました（未分類モード）")
        return {"success": True}

    # ==========================================
    # SSE (Server-Sent Events) リアルタイム配信
    # ==========================================

    @app.get("/api/events")
    async def events_stream(request: Request):
        async def event_generator():
            logger.info("New web client connected to SSE event stream.")
            # 初回接続時に現在のステータスを送信
            initial_state = {
                "time": datetime.now().strftime("%H:%M:%S"),
                "type": "INIT",
                "message": "ダッシュボードに接続しました",
                "data": {
                    "active_patient_id": config_manager.active_patient_id,
                    "active_patient_name": config_manager.active_patient_name,
                    "recent_photos": config_manager.recent_photos
                }
            }
            yield f"data: {import_json_str(initial_state)}\n\n"

            while True:
                # クライアント接続切断検知
                if await request.is_disconnected():
                    logger.info("Web client disconnected from SSE event stream.")
                    break
                
                try:
                    # 新しいログイベントがキューに入るのを待機 (タイムアウト付きでブロッキング回避)
                    event = await asyncio.wait_for(event_queue.get(), timeout=1.0)
                    yield f"data: {import_json_str(event)}\n\n"
                    event_queue.task_done()
                except asyncio.TimeoutError:
                    # ハートビート送信（接続維持用）
                    yield ": heartbeat\n\n"
                except Exception as e:
                    logger.error(f"Error in SSE generator: {e}")
                    break

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    return app

def import_json_str(data):
    import json
    return json.dumps(data, ensure_ascii=False)
