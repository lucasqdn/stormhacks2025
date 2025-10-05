import base64
from io import BytesIO
from pathlib import Path
from typing import Optional

from PIL import Image
from ultralytics import YOLO

# Optional second-stage classifier to expand label coverage.
# If torchvision isn't installed, this module sets AVAILABLE=False and we skip it.
try:
    from . import classifier as _cls
except Exception:  # pragma: no cover - optional import
    _cls = None


_MODEL_PATH = Path(__file__).with_name("yolov8n.pt")
_MODEL = YOLO(str(_MODEL_PATH))  # Load once at import time from local file


def detect_object(image_base64: str):
    # Load image
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(BytesIO(image_bytes))

    # Run inference on the image using the global model.
    # Tune thresholds for better quality on CPU: raise conf, moderate NMS, cap detections, bump input size slightly.
    results = _MODEL.predict(image, conf=0.35, iou=0.6, max_det=10, imgsz=768, verbose=False)
    result = results[0]

    if len(result.boxes) == 0:
        print("No objects detected.")
        return None

    # Prefer the most relevant subject using a composite score:
    #   score = confidence + area_bonus + center_bonus
    boxes = result.boxes
    conf = boxes.conf.squeeze(-1)   # (N,)
    xyxy = boxes.xyxy               # (N, 4)

    # Image dims for normalization
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
    center_bonus = 1.0 - (center_dist / 1.414)        # ~[0..1]

    score = conf + 0.30 * area_norm + 0.15 * center_bonus

    best_idx = int(score.argmax().item())
    best_class_id = int(boxes.cls[best_idx])
    yolo_label = result.names.get(best_class_id, str(best_class_id))

    # Optional: second-stage classification on the selected crop to expand label coverage
    # and reduce common confusions. This is used only if torchvision is available.
    fused_label: Optional[str] = None
    try:
        if _cls is not None and getattr(_cls, "AVAILABLE", False):
            x1, y1, x2, y2 = [int(v) for v in xyxy[best_idx].tolist()]
            # Clamp to image bounds
            x1 = max(0, min(x1, w - 1))
            y1 = max(0, min(y1, h - 1))
            x2 = max(0, min(x2, w))
            y2 = max(0, min(y2, h))
            if x2 > x1 and y2 > y1:
                crop = image.crop((x1, y1, x2, y2))
                cls_label, cls_prob = _cls.classify_pil(crop)
                # Fusion rule: if classifier is confident, prefer it;
                # otherwise fall back to YOLO label.
                if cls_prob >= 0.65 or float(conf[best_idx].item()) < 0.45:
                    fused_label = cls_label
    except Exception:
        # If classifier fails for any reason, silently fall back to YOLO label
        fused_label = None

    best_label = fused_label or yolo_label

    return best_label
