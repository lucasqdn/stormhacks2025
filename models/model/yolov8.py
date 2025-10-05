from ultralytics import YOLO

# Load pre-trained YOLOv8n model
model = YOLO("yolov8n.pt")

# Run inference on an example image
results = model.predict("https://ultralytics.com/images/bus.jpg")  # online image
result = results[0]  # save results to a directory