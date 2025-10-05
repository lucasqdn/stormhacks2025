from functools import lru_cache
import easyocr
from ultralytics import YOLO

@lru_cache(maxsize=1)
def get_reader():
    # English only for speed; add languages if you dare
    return easyocr.Reader(['en'], gpu=False)

@lru_cache(maxsize=1)
def get_detector():
    # Use a tiny model for speed; replace path with your local .pt if custom-trained
    # 'yolov8n.pt' is fine to get big boxes; or supply your 'label-detector.pt'
    return YOLO('yolov8n.pt')
