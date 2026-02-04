import os
from dotenv import load_dotenv
import re
from typing import List

load_dotenv()

GMS_API_KEY = os.getenv("GMS_API_KEY")
GMS_API_BASE = (os.getenv("GMS_API_BASE") or "").rstrip("/")

if not GMS_API_KEY:
    raise ValueError("GMS_API_KEY not found. Put it in .env")
if not GMS_API_BASE:
    raise ValueError("GMS_API_BASE not found. Put it in .env")

BASE_URL = f"{GMS_API_BASE}/api.openai.com/v1"

# 간단 캐시 (같은 문장 반복 번역 비용 줄이기)
_CACHE = {}

def translate_text(text: str, target_lang: str, source_lang: str = "ko", model_name: str = "gpt-5-mini") -> str:
    """
    (text, target_lang) -> translated_text
    - 자막용: 짧고 자연스럽게
    - 원문 의미 유지
    """
    text = (text or "").strip()
    target_lang = (target_lang or "").strip().lower()
    source_lang = (source_lang or "").strip().lower()

    if not text:
        return ""
    if not target_lang or target_lang == source_lang:
        return text

    key = (text, target_lang, source_lang)
    if key in _CACHE:
        return _CACHE[key]

    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate

    llm = ChatOpenAI(
        model=model_name,
        temperature=0.2,
        api_key=GMS_API_KEY,
        base_url=BASE_URL,
    )

    system = (
        "You are a professional subtitle translator.\n"
        "Translate the user's subtitle line.\n"
        "Rules:\n"
        "- Keep it SHORT and natural for subtitles.\n"
        "- Keep the tone (casual/serious) similar.\n"
        "- Do NOT add extra context.\n"
        "- Do NOT include quotes, labels, or explanations.\n"
        "- Return ONLY the translated text.\n"
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            ("user", "Source language: {source_lang}\nTarget language: {target_lang}\nText: {text}"),
        ]
    )

    res = (prompt | llm).invoke({"source_lang": source_lang, "target_lang": target_lang, "text": text})
    out = (res.content or "").strip()

    # 번역이 비정상적으로 비면 원문 fallback
    if not out:
        out = text

    _CACHE[key] = out
    return out


def translate_lines_batch(
    lines: List[str],
    target_lang: str,
    source_lang: str = "ko",
    model_name: str = "gpt-5-mini",
) -> List[str]:
    """
    여러 자막 라인을 한 번에 번역해서 리스트로 반환.
    - 호출 1번으로 N줄 번역 => 훨씬 빠름/저렴
    """
    lines = [ (s or "").strip() for s in (lines or []) ]
    if not lines:
        return []
    target_lang = (target_lang or "").strip().lower()
    source_lang = (source_lang or "").strip().lower()

    if not target_lang or target_lang == source_lang:
        return lines

    # 너무 긴 라인/빈 라인 정리
    cleaned = []
    idx_map = []
    for i, s in enumerate(lines):
        if s:
            cleaned.append(s)
            idx_map.append(i)

    if not cleaned:
        return [""] * len(lines)

    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate

    llm = ChatOpenAI(
        model=model_name,
        temperature=0.2,
        api_key=GMS_API_KEY,
        base_url=BASE_URL,
    )

    system = (
        "You are a professional subtitle translator.\n"
        "Translate each line for subtitles.\n"
        "Rules:\n"
        "- Keep each line SHORT and natural.\n"
        "- Preserve tone.\n"
        "- Do NOT add explanations.\n"
        "- Output MUST be the same number of lines as input.\n"
        "- Return ONLY plain text lines separated by newline.\n"
    )

    # 라인 앞에 번호를 붙여서 안전하게 맞추기
    numbered = "\n".join([f"{k+1}. {s}" for k, s in enumerate(cleaned)])

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            ("user",
             "Source language: {source}\nTarget language: {target}\n\n"
             "Translate the following numbered lines.\n"
             "Keep numbering.\n\n"
             "{numbered_lines}"
            ),
        ]
    )

    res = (prompt | llm).invoke({
        "source": source_lang,
        "target": target_lang,
        "numbered_lines": numbered
    })
    out = (res.content or "").strip()

    # 파싱: "1. xxx" 형태로 다시 리스트화
    translated = [""] * len(cleaned)
    for line in out.splitlines():
        m = re.match(r"^\s*(\d+)\.\s*(.*)$", line.strip())
        if not m:
            continue
        n = int(m.group(1)) - 1
        if 0 <= n < len(cleaned):
            translated[n] = (m.group(2) or "").strip()

    # 빈 번역은 원문 fallback
    for i in range(len(translated)):
        if not translated[i]:
            translated[i] = cleaned[i]

    # 원래 위치에 다시 넣기
    result = [""] * len(lines)
    for j, orig_i in enumerate(idx_map):
        result[orig_i] = translated[j]
    return result
