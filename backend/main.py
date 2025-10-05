from fastapi import FastAPI
from googletrans import Translator
from model.yolov8 import detect_object
from pydantic import BaseModel

app = FastAPI()

translator = Translator()


class ProcessImageRequest(BaseModel):
    src_lang: str
    dest_lang: str
    image: str


@app.post("/process-image")
def process_image(payload: ProcessImageRequest) -> dict[str, str]:
    obj = detect_object(payload.image)

    obj_src_lang = translator.translate(text=obj, dest=payload.src_lang).text
    obj_dest_lang = translator.translate(text=obj, dest=payload.dest_lang).text

    return {"src_lang_description": obj_src_lang, "dest_lang_description": obj_dest_lang}
