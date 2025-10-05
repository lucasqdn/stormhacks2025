import json, base64, io
import numpy as np
import cv2
from typing import Tuple

def load_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def decode_image(content: bytes) -> np.ndarray:
    arr = np.frombuffer(content, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image bytes")
    return img

def crop_with_padding(img: np.ndarray, box: Tuple[int,int,int,int], pad: int = 8):
    h, w = img.shape[:2]
    x1, y1, x2, y2 = box
    x1 = max(0, x1 - pad); y1 = max(0, y1 - pad)
    x2 = min(w, x2 + pad); y2 = min(h, y2 + pad)
    return img[y1:y2, x1:x2].copy()

def to_base64_png(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    if not ok: return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")
