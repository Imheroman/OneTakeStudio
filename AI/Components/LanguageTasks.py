import os
import re
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

# ---- GMS env ----
GMS_API_KEY = os.getenv("GMS_API_KEY")
GMS_API_BASE = (os.getenv("GMS_API_BASE") or "").rstrip("/")

if not GMS_API_KEY:
    raise ValueError("GMS_API_KEY not found. Put it in .env")

BASE_URL = f"{GMS_API_BASE}/api.openai.com/v1"


# --- 1. 데이터 구조체 ---
class TranscriptSegment:
    def __init__(self, start, end, text):
        self.start = float(start)
        self.end = float(end)
        self.text = str(text).strip()

class JSONResponse(BaseModel):
    start: float = Field(description="Start time of the CORE interesting part")
    end: float = Field(description="End time of the CORE interesting part")
    reason: str = Field(description="Short reason why this is the best part")


SYSTEM_PROMPT = """
You are an expert video editor. Your task is to find the **single most engaging "Hook"** from the transcript.

**INSTRUCTIONS:**
1. Read the transcript and find the most interesting/funny/dramatic moment.
2. **Core Duration:** Pick a segment between **30 to 60 seconds**.
3. **DO NOT** worry about hitting exactly 90 seconds. The system will expand it automatically.
4. Focus purely on the **content quality** (emotional peak, punchline, plot twist).

**OUTPUT:**
Return the start and end time of this core moment.
"""

def _parse_transcript_string(text: str):
    """문자열 형태('0.0 - 2.0: 안녕')를 객체 리스트로 변환"""
    segments = []
    # 정규식: "숫자 - 숫자: 텍스트" 또는 "숫자 -> 숫자] 텍스트" 등 유연하게 대응
    # 예: 0.0 - 2.0: Hello
    pattern = re.compile(r"(\d+(?:\.\d+)?)\s*[-~>]\s*(\d+(?:\.\d+)?)\s*[:\]]\s*(.*)")
    
    lines = text.strip().split('\n')
    for line in lines:
        match = pattern.search(line)
        if match:
            try:
                s = float(match.group(1))
                e = float(match.group(2))
                t = match.group(3).strip()
                segments.append(TranscriptSegment(s, e, t))
            except:
                continue
    return segments

def _format_transcript_for_llm(segments):
    """LLM에게 보여줄 텍스트 포맷팅"""
    lines = []
    for seg in segments:
        lines.append(f"{seg.start:.1f} - {seg.end:.1f}: {seg.text}")
    return "\n".join(lines)

def expand_to_duration(segments, core_start, core_end, target_duration=90.0):
    """Center-Out 확장 로직"""
    start_idx = -1
    end_idx = -1
    
    # Core 영역 찾기
    for i, seg in enumerate(segments):
        if start_idx == -1 and seg.end >= core_start:
            start_idx = i
        if seg.start <= core_end:
            end_idx = i
            
    if start_idx == -1: start_idx = 0
    if end_idx == -1: end_idx = len(segments) - 1
    if end_idx < start_idx: end_idx = start_idx

    current_duration = segments[end_idx].end - segments[start_idx].start
    
    # 90초 채우기
    while current_duration < target_duration:
        can_expand_left = (start_idx > 0)
        can_expand_right = (end_idx < len(segments) - 1)
        
        if not can_expand_left and not can_expand_right:
            break 
            
        if can_expand_left and can_expand_right:
            start_idx -= 1
            end_idx += 1
        elif can_expand_left:
            start_idx -= 1
        elif can_expand_right:
            end_idx += 1
            
        current_duration = segments[end_idx].end - segments[start_idx].start

    return segments[start_idx].start, segments[end_idx].end


def GetHighlight(transcription_data, model_name: str = "gpt-4o-mini"):
    """
    Args:
        transcription_data: List [[text, start, end], ...] OR String
    """
    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate

    if not transcription_data:
        print("ERROR: Empty transcription data")
        return None, None

    # --- 1. 입력 데이터 파싱 (리스트/문자열 처리) ---
    segments = []
    if isinstance(transcription_data, str):
        segments = _parse_transcript_string(transcription_data)
    elif isinstance(transcription_data, list):
        try:
            for item in transcription_data:
                if len(item) >= 3:
                    segments.append(TranscriptSegment(item[1], item[2], item[0]))
        except Exception as e:
            print(f"ERROR: Failed to parse list items: {e}")
            return None, None
    
    if not segments:
        print("ERROR: No valid segments found.")
        return None, None

    # 영상이 90초보다 짧은 경우
    total_duration = segments[-1].end - segments[0].start
    if total_duration < 90:
        print(f"Video too short ({total_duration:.1f}s). Returning full clip.")
        return int(segments[0].start), int(segments[1].end)

    # --- 2. LLM 호출 ---
    llm_input = _format_transcript_for_llm(segments)

    try:
        llm = ChatOpenAI(
            model=model_name,
            temperature=0.6,
            api_key=GMS_API_KEY,
            base_url=BASE_URL,
        )

        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SYSTEM_PROMPT),
                ("user", "{Transcription}"),
            ],
            template_format="f-string",
        )

        # with_structured_output이 dict를 반환할 수도, Pydantic을 반환할 수도 있음
        chain = prompt | llm.with_structured_output(JSONResponse, method="function_calling")

        print("AI Selecting Core Hook...")
        response = chain.invoke({"Transcription": llm_input})
        
        if not response:
            return None, None

        if isinstance(response, dict):
            core_start = float(response.get("start", 0))
            core_end = float(response.get("end", 0))
            reason = response.get("reason", "")
        else:
            # Pydantic 객체인 경우
            core_start = float(response.start)
            core_end = float(response.end)
            reason = getattr(response, "reason", "")

        print(f"Core Hook Found: {core_start}s - {core_end}s")
        print(f"   Reason: {reason}")

        # --- 3. Python 확장 로직 ---
        final_start, final_end = expand_to_duration(
            segments, core_start, core_end, target_duration=90.0
        )
        
        print(f"FINAL SEGMENT: {final_start:.1f}s - {final_end:.1f}s")
        return int(final_start), int(final_end)

    except Exception as e:
        print(f"ERROR inside GetHighlight: {e}")
        import traceback
        traceback.print_exc()
        return None, None