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

    # Run inference on the image using the global model (barebones)
    results = _MODEL.predict(image)
    result = results[0]

    if len(result.boxes) == 0:
        print("No objects detected.")
        return None

    # Prefer objects that are BOTH sufficiently confident and relatively large.
    # If none meet both thresholds, fall back to a composite score (conf + k*area).
    boxes = result.boxes
    conf = boxes.conf.squeeze(-1)  # (N,)
    xyxy = boxes.xyxy              # (N, 4)

    # Compute relative area per box
    widths = (xyxy[:, 2] - xyxy[:, 0]).clamp(min=0)
    heights = (xyxy[:, 3] - xyxy[:, 1]).clamp(min=0)
    areas = widths * heights

    # Normalize by image area to get area fraction
    h, w = result.orig_shape
    img_area = max(float(w) * float(h), 1.0)
    area_frac = areas / img_area

    CONF_THRESH = 0.40         # confidence must be at least this
    AREA_FRAC_THRESH = 0.03    # box must cover at least 3% of the image

    mask = (conf >= CONF_THRESH) & (area_frac >= AREA_FRAC_THRESH)
    if mask.any():
        idxs = mask.nonzero(as_tuple=False).squeeze(-1)
        # Among qualifying boxes, maximize a composite score
        score = conf[idxs] + 0.50 * area_frac[idxs]
        best_idx = int(idxs[int(score.argmax().item())].item())
    else:
        # Fallback: weighted composite across all boxes
        score_all = conf + 0.30 * area_frac
        best_idx = int(score_all.argmax().item())
    best_class_id = int(result.boxes.cls[best_idx])
    best_label = _MODEL.names[best_class_id]

    return best_label


def get_runtime_info() -> dict:
    """Return minimal runtime info for compatibility with older imports.

    Includes detector weights filename and number of classes. No classifier.
    """
    try:
        names = getattr(_MODEL, "names", {})
        num_classes = len(names) if isinstance(names, dict) else len(names)
    except Exception:
        num_classes = None

    return {
        "detector": {
            "weights_file": str(_MODEL_PATH.name),
            "num_classes": num_classes,
        }
    }
