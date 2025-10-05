from googletrans import Translator

translator = Translator()

print(translator.translate("bus", dest="ko").text)  # Korean
print(translator.translate("car", dest="vi").text)  # Vietnamese
print(translator.translate("swivel chair", dest="vi").text)  # Simplified Chinese