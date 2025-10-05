import base64
from io import BytesIO
from pathlib import Path
from PIL import Image
from ultralytics import YOLO


_MODEL_PATH = Path(__file__).with_name("yolov8n.pt")
_MODEL = YOLO(str(_MODEL_PATH))  # Load once at import time from local file


def detect_object(image_base64: str):
    # Load image
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(BytesIO(image_bytes))

    # Run inference on the image using the global model
    results = _MODEL.predict(image)
    result = results[0]

    if len(result.boxes) == 0:
        print("No objects detected.")
        return None

    # Use tensor.argmax to select the highest-confidence box
    best_idx = int(result.boxes.conf.argmax().item())
    best_class_id = int(result.boxes.cls[best_idx])
    best_label = _MODEL.names[best_class_id]

    return best_label
