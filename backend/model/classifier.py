import os
import sys
from typing import Tuple

# Feature flag: allow disabling classifier in production to avoid weight downloads
_USE_CLASSIFIER = os.getenv("USE_CLASSIFIER", "0").lower() in ("1", "true", "yes", "on")

try:
    import torch
    from PIL import Image
    from torchvision import models
    from torchvision.models import MobileNet_V3_Large_Weights
except Exception as e:  # pragma: no cover - optional dependency
    AVAILABLE = False
    _IMPORT_ERROR = e
    _CLS_MODEL = None
    _CLS_TRANSFORM = None
    _CLS_NAMES = []
else:
    if not _USE_CLASSIFIER:
        AVAILABLE = False
        _IMPORT_ERROR = RuntimeError("classifier disabled via USE_CLASSIFIER=0")
        _CLS_MODEL = None
        _CLS_TRANSFORM = None
        _CLS_NAMES = []
    else:
        # Try to load weights; if download/cache fails, mark unavailable gracefully
        try:
            _WEIGHTS = MobileNet_V3_Large_Weights.DEFAULT
            _CLS_MODEL = models.mobilenet_v3_large(weights=_WEIGHTS)
            _CLS_MODEL.eval()
            _CLS_TRANSFORM = _WEIGHTS.transforms()
            _CLS_NAMES = _WEIGHTS.meta.get("categories", [])
            AVAILABLE = True
            _IMPORT_ERROR = None
        except Exception as e:  # pragma: no cover
            AVAILABLE = False
            _IMPORT_ERROR = e
            _CLS_MODEL = None
            _CLS_TRANSFORM = None
            _CLS_NAMES = []


def classify_pil(img: "Image.Image") -> Tuple[str, float]:
    """Classify a PIL image crop and return (label, probability in [0,1]).

    If torchvision isn't available, raises the original import error.
    """
    if not AVAILABLE:
        raise RuntimeError("classifier is unavailable") from _IMPORT_ERROR

    if img.mode != "RGB":
        img = img.convert("RGB")

    with torch.no_grad():
        x = _CLS_TRANSFORM(img).unsqueeze(0)  # (1, C, H, W)
        logits = _CLS_MODEL(x)
        probs = torch.softmax(logits, dim=1)[0]
        conf, idx = torch.max(probs, dim=0)
        label = _CLS_NAMES[idx.item()] if _CLS_NAMES else str(idx.item())
        return label, float(conf.item())
