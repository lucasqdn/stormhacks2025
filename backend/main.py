import asyncio
import logging
from typing import Dict

from fastapi import FastAPI
from googletrans import Translator
from model.yolov8 import detect_object
from pydantic import BaseModel

app = FastAPI()
logger = logging.getLogger("uvicorn")
VERSION = "2025-10-05a"

translator = Translator()


class ProcessImageRequest(BaseModel):
    src_lang: str
    dest_lang: str
    image: str  # base64-encoded image string


class IdentifyRequest(BaseModel):
    image_base64: str
    target_lang: str


async def translate_text(text: str, dest_lang: str) -> str:
    """Translate text handling both sync and coroutine returns across googletrans variants."""
    try:
        result = translator.translate(text=text, dest=dest_lang)
        if asyncio.iscoroutine(result):
            result = await result
        return getattr(result, "text", str(result))
    except Exception:
        # Fall back to original text on translation failure
        return text


def safe_detect(image_b64: str) -> str:
    """Wrap detect_object to avoid crashing the endpoint and add simple logging."""
    try:
        obj = detect_object(image_b64)
        logger.info(f"detect_object -> '{obj}'")
        return obj or ""
    except Exception as e:
        logger.exception(f"detect_object failed: {e}")
        return ""


@app.post("/process-image")
async def process_image(payload: ProcessImageRequest) -> Dict[str, str]:
    # Run object detection (synchronous)
    obj = safe_detect(payload.image)

    # Translate to requested languages (robust to coroutine return)
    obj_src_lang = await translate_text(obj, payload.src_lang)
    obj_dest_lang = await translate_text(obj, payload.dest_lang)

    return {"src_lang_description": obj_src_lang, "dest_lang_description": obj_dest_lang}


@app.post("/identify")
async def identify(payload: IdentifyRequest) -> Dict[str, str]:
    """Compatibility endpoint: detect object and translate to a single target language.
    Returns shape { word, translation }.
    """
    obj = safe_detect(payload.image_base64)
    translation = await translate_text(obj, payload.target_lang)
    return {"word": obj, "translation": translation}


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "version": VERSION}
