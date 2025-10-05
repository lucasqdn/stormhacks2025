from googletrans import Translator
from yolov8 import object_detection

translator = Translator()

languages = {
    'english': 'en',
    'korean': 'ko',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'vietnamese': 'vi',
}

print(translator.translate(object_detection(), dest=languages.get('korean')).text)