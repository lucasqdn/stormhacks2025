from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pipeline import analyze_image
from utils import load_json


app = FastAPI(title="GuideScan CV Service", version="0.1.0")
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon, ship it
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CATALOG = load_json("catalog.json")
MED_SAFETY = load_json("med_safety.json")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    # Expect image/jpeg or image/png
    content = await file.read()
    try:
        result = analyze_image(content, catalog=CATALOG, med_safety=MED_SAFETY)
        return JSONResponse(result)
    except Exception as e:
        # ruthless: fail loud so you actually fix it
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/analyze-ocr-only")
async def analyze_ocr_only(file: UploadFile = File(...)):
    content = await file.read()
    try:
        result = analyze_image(content, catalog=CATALOG, med_safety=MED_SAFETY, use_detector=False)
        return JSONResponse(result)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
