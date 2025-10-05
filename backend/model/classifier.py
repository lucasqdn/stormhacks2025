import sys
from typing import Tuple

try:
    import torch
    from PIL import Image
    from torchvision import models, transforms
    from torchvision.models import MobileNet_V3_Large_Weights
except Exception as e:  # pragma: no cover - optional dependency
    # Torch/torchvision may not be installed in some environments.
    # Expose a flag so callers can skip classification gracefully.
    AVAILABLE = False
    _IMPORT_ERROR = e
else:
    AVAILABLE = True
    _IMPORT_ERROR = None

    # Load a lightweight classifier and its preprocessing transforms once
    _WEIGHTS = MobileNet_V3_Large_Weights.DEFAULT
    _CLS_MODEL = models.mobilenet_v3_large(weights=_WEIGHTS)
    _CLS_MODEL.eval()

    _CLS_TRANSFORM = _WEIGHTS.transforms()
    _CLS_NAMES = _WEIGHTS.meta.get("categories", [])


def classify_pil(img: "Image.Image") -> Tuple[str, float]:
    """Classify a PIL image crop and return (label, probability in [0,1]).

    If torchvision isn't available, raises the original import error.
    """
    if not AVAILABLE:
        raise RuntimeError(
            "classifier is unavailable: torchvision not installed"
        ) from _IMPORT_ERROR

    if img.mode != "RGB":
        img = img.convert("RGB")

    with torch.no_grad():
        x = _CLS_TRANSFORM(img).unsqueeze(0)  # (1, C, H, W)
        logits = _CLS_MODEL(x)
        probs = torch.softmax(logits, dim=1)[0]
        conf, idx = torch.max(probs, dim=0)
        label = _CLS_NAMES[idx.item()] if _CLS_NAMES else str(idx.item())
        return label, float(conf.item())
