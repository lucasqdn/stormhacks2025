from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class TranslateRequest(BaseModel):
    text: str
    target_language: str

@app.post("/translate")
def translate_api(request: TranslateRequest):
    try:
        result = translate(request.text, request.target_language)
        return {"translated_text": result}
    except ValueError as e:
        return {"error": str(e)}