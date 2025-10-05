from ultralytics import YOLO
from torch import torch

# Load pre-trained YOLOv8n model
model = YOLO("yolov8n.pt")

# Run inference on an example image
results = model.predict("https://ultralytics.com/images/bus.jpg")  # online image
result = results[0]

if len(result.boxes) == 0:
    print("No objects detected.")
else:
    best_idx = torch.argmax(result.boxes.conf).item()

    best_class_id = int(result.boxes.cls[best_idx])
    best_label = model.names[best_class_id]

    print("Most confident detection:", best_label)