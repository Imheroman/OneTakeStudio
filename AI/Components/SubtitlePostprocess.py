from pydantic import BaseModel, Field
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

GMS_API_KEY = os.getenv("GMS_API_KEY")
GMS_API_BASE = (os.getenv("GMS_API_BASE") or "").rstrip("/")
BASE_URL = f"{GMS_API_BASE}/api.openai.com/v1"

class SegIn(BaseModel):
    start: float
    end: float
    text: str

class PostIn(BaseModel):
    lang: str = "ko"
    segments: List[SegIn]

class SegOut(BaseModel):
    start: float
    end: float
    text: str

class PostOut(BaseModel):
    segments: List[SegOut]

SYSTEM = """
You are a subtitle post-processor.
Goal: Improve subtitle readability WITHOUT changing meaning.

Rules:
- Keep the SAME start/end timestamps.
- Fix spacing, typos, punctuation.
- Remove filler noises: "음", "어", "그", repeated stutters, trailing dots.
- Keep the speaker’s intent; do NOT add new facts.
- If text is empty/meaningless (only punctuation), return "".
- Output must be JSON following the schema.
"""

def postprocess_subtitles(transcriptions, lang="ko", model="gpt-5-mini", chunk_size=80):
    """
    transcriptions: [[text, start, end], ...]
    returns same format
    """
    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate

    llm = ChatOpenAI(
        model=model,
        temperature=1.0,
        api_key=GMS_API_KEY,
        base_url=BASE_URL,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM),
        ("user", "{payload}"),
    ])

    chain = prompt | llm.with_structured_output(PostOut, method="function_calling")

    out = []

    # 길면 나눠서 처리(비용/안정성)
    for i in range(0, len(transcriptions), chunk_size):
        chunk = transcriptions[i:i+chunk_size]
        payload = {
            "lang": lang,
            "segments": [{"start": float(s), "end": float(e), "text": str(t)} for (t, s, e) in chunk]
        }

        resp = chain.invoke({"payload": payload})
        
        # Handle both dict and PostOut object responses
        segments = resp.segments if hasattr(resp, 'segments') else resp.get('segments', [])
        
        for seg in segments:
            # Handle both dict and SegOut object
            if isinstance(seg, dict):
                text = (seg.get('text') or "").strip()
                start = seg.get('start')
                end = seg.get('end')
            else:
                text = (seg.text or "").strip()
                start = seg.start
                end = seg.end
            
            if text:
                out.append([text, start, end])

    return out
