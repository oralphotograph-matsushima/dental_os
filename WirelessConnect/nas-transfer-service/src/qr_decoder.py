import cv2
import numpy as np
from pyzbar.pyzbar import decode as decode_zbar
from PIL import Image
import logging

logger = logging.getLogger("nas-transfer")

def decode_qr_code(image_path: str) -> str | None:
    """
    臨床用カメラで撮影された写真からQRコードを高精度に検出・デコードするマルチレイヤーデコーダー。
    """
    logger.debug(f"Attempting to decode QR code from: {image_path}")

    # 1. 画像の読み込み
    try:
        # 日本語ファイルパスに対応するため、numpy経由で読み込む
        img_array = np.fromfile(image_path, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if img is None:
            logger.error(f"Failed to load image via OpenCV: {image_path}")
            return None
    except Exception as e:
        logger.error(f"Error loading image {image_path}: {e}")
        return None

    # 2. 解像度が大きすぎる場合はアスペクト比を維持して縮小（処理速度向上とピクセル密度最適化）
    # 臨床カメラの写真は非常に高解像度（4000px以上）なため、QRデコードが逆に失敗しやすい
    h, w = img.shape[:2]
    max_dimension = 2000
    if max(h, w) > max_dimension:
        scale = max_dimension / max(h, w)
        img_resized = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        img_resized = img.copy()

    # 3. 変換用のグレースケール画像を作成
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)

    # ----------------------------------------------------
    # レイヤー 1: オリジナル状態での pyzbar デコード (最速かつ通常ケース用)
    # ----------------------------------------------------
    try:
        pil_img = Image.fromarray(cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB))
        zbar_results = decode_zbar(pil_img)
        if zbar_results:
            decoded_text = zbar_results[0].data.decode('utf-8').strip()
            logger.info(f"QR decoded successfully at Layer 1 (Zbar/Raw): {decoded_text}")
            return decoded_text
    except Exception as e:
        logger.debug(f"Layer 1 Zbar failed: {e}")

    # ----------------------------------------------------
    # レイヤー 2: CLAHE (適応的ヒストグラム平坦化) + pyzbar
    # 光の反射や影、露出アンダー/オーバーに対応
    # ----------------------------------------------------
    try:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced_gray = clahe.apply(gray)
        
        pil_enhanced = Image.fromarray(enhanced_gray)
        zbar_results = decode_zbar(pil_enhanced)
        if zbar_results:
            decoded_text = zbar_results[0].data.decode('utf-8').strip()
            logger.info(f"QR decoded successfully at Layer 2 (Zbar/CLAHE): {decoded_text}")
            return decoded_text
    except Exception as e:
        logger.debug(f"Layer 2 Zbar/CLAHE failed: {e}")

    # ----------------------------------------------------
    # レイヤー 3: 大津の二値化 (Otsu's Thresholding) + pyzbar
    # 紙の白とコードの黒をハイコントラスト化
    # ----------------------------------------------------
    try:
        # ノイズ除去のための軽いガウシアンブラー
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        pil_thresh = Image.fromarray(thresh)
        zbar_results = decode_zbar(pil_thresh)
        if zbar_results:
            decoded_text = zbar_results[0].data.decode('utf-8').strip()
            logger.info(f"QR decoded successfully at Layer 3 (Zbar/Otsu): {decoded_text}")
            return decoded_text
    except Exception as e:
        logger.debug(f"Layer 3 Zbar/Otsu failed: {e}")

    # ----------------------------------------------------
    # レイヤー 4: OpenCV QRCodeDetector (フォールバック)
    # ----------------------------------------------------
    try:
        detector = cv2.QRCodeDetector()
        # グレースケールでテスト
        data, bbox, _ = detector.detectAndDecode(gray)
        if data:
            decoded_text = data.strip()
            logger.info(f"QR decoded successfully at Layer 4 (OpenCV/Gray): {decoded_text}")
            return decoded_text
            
        # 二値化画像でテスト
        data_thresh, bbox_thresh, _ = detector.detectAndDecode(thresh)
        if data_thresh:
            decoded_text = data_thresh.strip()
            logger.info(f"QR decoded successfully at Layer 4 (OpenCV/Thresh): {decoded_text}")
            return decoded_text
    except Exception as e:
        logger.debug(f"Layer 4 OpenCV failed: {e}")

    logger.debug(f"No QR code detected in image: {image_path}")
    return None
