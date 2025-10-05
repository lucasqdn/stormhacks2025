import base64
from io import BytesIO

from PIL import Image
from torch import argmax
from ultralytics import YOLO


def detect_object(image_base64: str):
    # Load image
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(BytesIO(image_bytes))

    # Load pre-trained YOLOv8n model
    model = YOLO("yolov8n.pt")

    # Run inference on the image
    results = model.predict(image)
    result = results[0]

    if len(result.boxes) == 0:
        print("No objects detected.")
        return None

    best_idx = argmax(result.boxes.conf).item()
    best_class_id = int(result.boxes.cls[best_idx])
    best_label = model.names[best_class_id]

    return best_label
