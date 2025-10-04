import time
import numpy as np
import cv2
from typing import Dict, Any
from models import get_reader, get_detector
from parsers import extract_fields
from utils import decode_image, crop_with_padding, to_base64_png

def analyze_image(content: bytes,
                  catalog: Dict[str, Any],
                  med_safety: Dict[str, Any],
                  use_detector: bool = True) -> Dict[str, Any]:
    t0 = time.time()
    img = decode_image(content)  # np.uint8 BGR

    # Optional detector to find the "label" ROI (helps OCR and latency)
    rois = []
    det_time = 0.0
    if use_detector:
        det_t0 = time.time()
        model = get_detector()  # Ultralytics YOLO (lightweight)
        # Expect a "label" or "package" class in your pretrained or default model
        res = model.predict(img, imgsz=640, conf=0.3, verbose=False)
        det_time = time.time() - det_t0
        for b in res[0].boxes.xyxy.cpu().numpy().astype(int):
            x1, y1, x2, y2 = b.tolist()
            rois.append(crop_with_padding(img, (x1, y1, x2, y2), pad=8))
    else:
        rois = [img]

    # OCR all candidate ROIs and choose the best
    ocr_t0 = time.time()
    reader = get_reader()
    best = {"score": -1, "text": "", "bbox": None, "roi_png": None}
    for roi in rois:
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        # light preprocessing (don’t get cute, keep it robust)
        gray = cv2.convertScaleAbs(gray, alpha=1.35, beta=8)  # contrast boost
        # adaptive threshold only if dark
        mean = float(np.mean(gray))
        if mean < 85:
            gray = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                         cv2.THRESH_BINARY, 35, 11)
        result = reader.readtext(gray, detail=1, paragraph=True)
        text = " ".join([r[1] for r in result]) if result else ""
        # crude score: length + mean conf
        if result:
            confs = [float(r[2]) for r in result]
            score = (len(text) / 40.0) + (sum(confs) / max(len(confs), 1))
        else:
            score = 0
        if score > best["score"]:
            best["score"] = score
            best["text"] = text
            best["roi_png"] = to_base64_png(roi)

    ocr_time = time.time() - ocr_t0

    fields = extract_fields(best["text"])

    # Catalog + safety enrichment (simple demo logic)
    matched = None
    # Prefer barcode path if RN sends UPC later; for now, try name fuzzy
    if fields["name"]:
        # naive exact/startswith match on your demo catalog
        for upc, meta in catalog.items():
            if meta["name"].lower().startswith(fields["name"].lower()[:8]):
                matched = {"upc": upc, **meta}
                break

    # Confidence scoring
    conf = 0.0
    if len(best["text"]) > 10: conf += 0.35
    if fields["name"]: conf += 0.25
    if fields["variant"]: conf += 0.2
    if fields["expiry_text"]: conf += 0.1
    if matched: conf += 0.1
    conf = min(conf, 1.0)

    # Safety enrichment
    safety = None
    key = (matched["name"] if matched else fields["name"]) or ""
    for k in med_safety.keys():
        if k.lower() in key.lower():
            safety = med_safety[k]
            break

    total = time.time() - t0
    return {
        "ok": True,
        "confidence": round(conf, 2),
        "fields": fields,               # parsed name/variant/expiry
        "catalog_match": matched,       # if any
        "safety": safety,               # dosage/warnings if med
        "timings": {
            "detector_sec": round(det_time, 3),
            "ocr_sec": round(ocr_time, 3),
            "total_sec": round(total, 3)
        },
        "debug": {
            "roi_png_b64": best["roi_png"]  # handy for your RN overlay
        }
    }
