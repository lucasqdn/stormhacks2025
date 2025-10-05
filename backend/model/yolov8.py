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
    # Tune thresholds for better quality on CPU: raise conf, moderate NMS, limit detections, increase input size slightly
    results = _MODEL.predict(image, conf=0.35, iou=0.6, max_det=10, imgsz=768, verbose=False)
    result = results[0]

    if len(result.boxes) == 0:
        print("No objects detected.")
        return None

    # Prefer the most relevant subject using a composite score:
    #   score = confidence + area_bonus + center_bonus
    # This helps avoid tiny high-confidence detections winning over the main object.
    boxes = result.boxes
    conf = boxes.conf.squeeze(-1)   # (N,)
    xyxy = boxes.xyxy               # (N, 4)

    # Image dimensions for normalization
    h, w = result.orig_shape
    img_area = max(float(w) * float(h), 1.0)

    # Relative area bonus (favor larger boxes)
    widths = (xyxy[:, 2] - xyxy[:, 0]).clamp(min=0)
    heights = (xyxy[:, 3] - xyxy[:, 1]).clamp(min=0)
    area = widths * heights
    area_norm = area / img_area

    # Center proximity bonus (favor central boxes)
    cx = (xyxy[:, 0] + xyxy[:, 2]) * 0.5
    cy = (xyxy[:, 1] + xyxy[:, 3]) * 0.5
    dx = (cx - (w * 0.5)).abs() / max(w * 0.5, 1.0)
    dy = (cy - (h * 0.5)).abs() / max(h * 0.5, 1.0)
    center_dist = (dx.pow(2) + dy.pow(2)).sqrt()      # 0 at center → better
    center_bonus = 1.0 - (center_dist / 1.414)        # normalize approx to [0..1]

    # Composite score (tune weights as desired)
    score = conf + 0.30 * area_norm + 0.15 * center_bonus

    best_idx = int(score.argmax().item())
    best_class_id = int(boxes.cls[best_idx])
    best_label = result.names.get(best_class_id, str(best_class_id))

    return best_label
