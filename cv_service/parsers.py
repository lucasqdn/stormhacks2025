import re

_BRANDS_HINT = [
    "campbell", "kleenex", "acetaminophen", "ibuprofen", "tylenol", "advil"
]

def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("®","").replace("™","")).strip()

def extract_fields(text: str):
    t = _norm(text.upper())

    # strength / variant
    strength = re.search(r"\b(\d+(?:\.\d+)?)\s?(MG|MCG|G|ML|M L|L|%)\b", t)
    pack = re.search(r"\b(\d+)\s?(PACK|TABS?|CAPS?)\b", t)

    # expiry
    exp_tag = re.search(r"(EXP|BEST BEFORE|BEST BY|USE BY|BB)\s*[:\-]?\s*", t)
    exp_date1 = re.search(r"\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b", t)
    exp_date2 = re.search(r"\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s?\d{2,4}\b", t)

    expiry_text = None
    if exp_tag and (exp_date1 or exp_date2):
        expiry_text = (exp_date1.group(0) if exp_date1 else exp_date2.group(0))

    # name guess: take first line that contains a brand-ish token
    lines = [ln for ln in re.split(r"[;\n]| {2,}", t) if ln.strip()]
    name = None
    for ln in lines[:4]:
        if any(b.upper() in ln for b in _BRANDS_HINT) and not re.fullmatch(r"[\d\W]+", ln):
            name = ln.title()
            break
    if not name and lines:
        # fallback to first non-numeric-ish line
        for ln in lines[:4]:
            if not re.fullmatch(r"[\d\W]+", ln):
                name = ln.title()
                break

    variant = None
    if strength: variant = strength.group(0).replace(" M L"," mL").title()
    if not variant and pack: variant = pack.group(0).title()

    return {
        "name": name,
        "variant": variant,
        "expiry_text": expiry_text
    }
