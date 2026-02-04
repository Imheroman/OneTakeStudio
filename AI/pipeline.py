# pipeline.py
import os
import uuid
import re
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from moviepy.editor import VideoFileClip

from Components.Edit import extractAudio, crop_video
from Components.Transcription import transcribeAudio
from Components.LanguageTasks import GetHighlight
from Components.FaceCrop import crop_to_vertical, combine_videos
from Components.Subtitles import add_subtitles_to_video

DEFAULT_KO_FONT = r"C:\Windows\Fonts\malgun.ttf"


def clean_filename(title: str) -> str:
    cleaned = (title or "output").lower()
    cleaned = re.sub(r'[<>:"/\\|?*\[\]]', "", cleaned)
    cleaned = re.sub(r"[\s_]+", "-", cleaned)
    cleaned = re.sub(r"-+", "-", cleaned)
    cleaned = cleaned.strip("-")
    return cleaned[:80] or "output"


def _ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def _safe_remove(path: str, verbose: bool = False):
    """안전하게 파일 삭제 (재시도 로직 포함)"""
    if not path:
        return False
    
    try:
        if not os.path.exists(path):
            if verbose:
                print(f"  [INFO] File not found: {os.path.basename(path)}")
            return False
        
        # 첫 시도
        try:
            os.remove(path)
            if verbose:
                print(f"  [OK] Deleted: {os.path.basename(path)}")
            return True
        except PermissionError:
            # 파일이 아직 열려있을 수 있으니 대기 후 재시도
            if verbose:
                print(f"  [WAIT] File locked, retrying in 1s: {os.path.basename(path)}")
            time.sleep(1)
            os.remove(path)
            if verbose:
                print(f"  [OK] Deleted (retry): {os.path.basename(path)}")
            return True
    except Exception as e:
        if verbose:
            print(f"  [WARN] Failed to delete {os.path.basename(path)}: {type(e).__name__}: {e}")
        return False


def _extract_highlight_text(transcriptions, start: float, end: float) -> str:
    parts = []
    for text, s, e in transcriptions:
        try:
            s = float(s); e = float(e)
        except Exception:
            continue
        if e <= start:
            continue
        if s >= end:
            break
        t = (text or "").strip()
        if t:
            parts.append(t)
    return " ".join(parts).strip()


def generate_titles_stub(text: str, lang: str = "ko") -> List[str]:
    """
    LLM을 사용하여 하이라이트 내용 기반 제목 3개 생성
    """
    if not text or not text.strip():
        print("[Titles] Empty text, using fallback titles")
        if lang == "ko":
            return ["추천 제목 1", "추천 제목 2", "추천 제목 3"]
        elif lang == "zh":
            return ["推荐标题 1", "推荐标题 2", "推荐标题 3"]
        elif lang == "ja":
            return ["推奨タイトル 1", "推奨タイトル 2", "推奨タイトル 3"]
        return ["Recommended Title 1", "Recommended Title 2", "Recommended Title 3"]
    
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        GMS_API_KEY = os.getenv("GMS_API_KEY")
        GMS_API_BASE = (os.getenv("GMS_API_BASE") or "").rstrip("/")
        BASE_URL = f"{GMS_API_BASE}/api.openai.com/v1"
        
        if not GMS_API_KEY or not GMS_API_BASE:
            print("[Titles] GMS API not configured, using fallback titles")
            if lang == "ko":
                return ["추천 제목 1", "추천 제목 2", "추천 제목 3"]
            elif lang == "zh":
                return ["推荐标题 1", "推荐标题 2", "推荐标题 3"]
            elif lang == "ja":
                return ["推奨タイトル 1", "推奨タイトル 2", "推奨タイトル 3"]
            return ["Recommended Title 1", "Recommended Title 2", "Recommended Title 3"]
        
        if lang == "ko":
            system_prompt = """
당신은 YouTube Shorts 제목 전문가입니다.
주어진 영상 하이라이트 내용을 보고, 클릭을 유도하는 짧고 임팩트 있는 제목 3개를 생성하세요.

요구사항:
- 각 제목은 30자 이내 (한글 기준)
- 감정적 임팩트가 있어야 함 (놀람, 흥미, 호기심 등)
- 클릭을 유도하는 표현 사용
- 오버하지 않되 흥미로워야 함
- 중복 없이 서로 다른 관점의 제목

응답 형식 (줄바꿈으로 구분, 번호 없음):
제목1
제목2
제목3
"""
        elif lang == "zh":
            system_prompt = """
你是YouTube Shorts标题专家。
看视频亮点内容，生成3个有吸引力、简洁有力的标题。

要求：
- 每个标题不超过30个字符（中文）
- 具有情感冲击力（惊喜、好奇、兴奋）
- 引导点击的表达方式
- 不夸大但要有吸引力
- 没有重复，不同角度的标题

响应格式（换行分隔，无序号）：
标题1
标题2
标题3
"""
        elif lang == "ja":
            system_prompt = """
あなたはYouTube Shorts タイトル専門家です。
ビデオハイライトコンテンツを見て、3つのクリック誘発タイトルを生成してください。

要件：
- 各タイトルは30文字以内（日本語）
- 感情的インパクト（驚き、好奇心、興奮）
- クリック誘発表現
- 誇張しすぎず魅力的
- 重複なし、異なる視点のタイトル

応答形式（改行区切り、番号なし）：
タイトル1
タイトル2
タイトル3
"""
        else:
            system_prompt = """
You are a YouTube Shorts title expert.
Given a video highlight transcript, create 3 catchy, clickable titles.

Requirements:
- Each title under 60 characters (English)
- Emotional impact (surprise, curiosity, excitement)
- Click-inducing expressions
- Different perspectives, no duplication
- Avoid clickbait but be engaging

Response format (newline-separated, no numbers):
Title1
Title2
Title3
"""
        
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=1.0,
            api_key=GMS_API_KEY,
            base_url=BASE_URL,
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("user", "Video Highlight:\n{content}"),
        ])
        
        chain = prompt | llm
        
        print("[Titles] Generating 3 titles with LLM...")
        response = chain.invoke({"content": text})
        
        # LLM 응답 파싱
        response_text = response.content if hasattr(response, 'content') else str(response)
        titles = [t.strip() for t in response_text.split('\n') if t.strip()]
        
        # 정확히 3개만 반환
        titles = titles[:3]
        if len(titles) < 3:
            print(f"[Titles] LLM returned only {len(titles)} titles, padding with defaults")
            defaults = ["추천 제목", "추천 제목", "추천 제목"] if lang == "ko" else ["Title", "Title", "Title"]
            titles.extend(defaults[len(titles):])
        
        print(f"[Titles] Generated: {titles}")
        return titles
        
    except Exception as e:
        print(f"[Titles] LLM generation failed: {e}")
        if lang == "ko":
            return ["추천 제목 1", "추천 제목 2", "추천 제목 3"]
        elif lang == "zh":
            return ["推荐标题 1", "推荐标题 2", "推荐标题 3"]
        elif lang == "ja":
            return ["推奨タイトル 1", "推奨タイトル 2", "推奨タイトル 3"]
        return ["Recommended Title 1", "Recommended Title 2", "Recommended Title 3"]


def process_one_video(
    input_video_path: str,
    video_id: str,
    job_id: str,
    need_subtitles: bool,
    subtitle_lang: str,
    source_lang: str = "ko",
    output_root: str = "./outputs",
    work_root: str = "./work",
    video_title: Optional[str] = None,
    on_progress=None,
) -> Dict[str, Any]:
    """
    10분 이내 영상 1개 -> 쇼츠 1개 + 제목 3개
    반환 dict는 api.py에서 합의한 결과 JSON에 매핑됨

    on_progress: Optional callback(step, total_steps, step_key) for progress reporting
    """
    TOTAL_STEPS = 7

    out_dir = os.path.join(output_root, job_id, video_id)
    work_dir = os.path.join(work_root, job_id, video_id)
    _ensure_dir(out_dir)
    _ensure_dir(work_dir)

    # temp paths
    wav_path = os.path.join(work_dir, f"audio_{job_id}_{video_id}.wav")
    temp_clip = os.path.join(work_dir, f"temp_clip_{job_id}_{video_id}.mp4")
    temp_cropped = os.path.join(work_dir, f"temp_cropped_{job_id}_{video_id}.mp4")
    temp_subtitled = os.path.join(work_dir, f"temp_subtitled_{job_id}_{video_id}.mp4")

    # 1) Extract wav
    if on_progress:
        on_progress(1, TOTAL_STEPS, "AUDIO_EXTRACTION")
    Audio = extractAudio(input_video_path, wav_path)
    if not Audio:
        raise RuntimeError("Failed to extract audio (wav)")

    # 2) STT (wav only)
    if on_progress:
        on_progress(2, TOTAL_STEPS, "TRANSCRIPTION")
    transcriptions = transcribeAudio(Audio, language=source_lang)
    if not transcriptions:
        # fallback: use first 90-120 seconds
        video_clip = VideoFileClip(input_video_path)
        total_duration = video_clip.duration
        video_clip.close()
        start, stop = 0, min(120, total_duration)
    else:
        # 3) Highlight selection
        if on_progress:
            on_progress(3, TOTAL_STEPS, "HIGHLIGHT_SELECTION")

        # Make text for GetHighlight
        TransText = ""
        for text, s, e in transcriptions:
            TransText += f"{s} - {e}: {text}\n"

        # Try up to 3 times to get a valid highlight (>=90s)
        max_retries = 3
        last_result = None  # 마지막 결과 저장 (90초 미만이라도)
        
        for attempt in range(max_retries):
            start, stop = GetHighlight(TransText)
            if start is not None and stop is not None:
                duration = stop - start
                last_result = (start, stop)  # 이번 결과 저장
                if duration >= 90:
                    print(f"[OK] Highlight selected on attempt {attempt + 1}: {start}s-{stop}s ({duration}s)")
                    break
                else:
                    if attempt < max_retries - 1:
                        print(f"  Attempt {attempt + 1}: Duration {duration}s < 90s, retrying...")
                    else:
                        print(f"  Attempt {attempt + 1}: Duration {duration}s < 90s (FINAL ATTEMPT)")
            else:
                if attempt < max_retries - 1:
                    print(f"  Attempt {attempt + 1} failed, retrying ({attempt + 2}/{max_retries})...")
        
        # 3회 재시도 후 처리
        if start is None or stop is None:
            # 모든 시도가 None 반환 → 폴백 (0-120초)
            print("\n[WARN] All highlight extraction attempts returned no result")
            video_clip = VideoFileClip(input_video_path)
            total_duration = video_clip.duration
            video_clip.close()
            
            if total_duration >= 90:
                start, stop = 0, min(120, total_duration)
                print(f"Using fallback segment: 0-{stop}s (from {total_duration}s total video)")
            else:
                start, stop = 0, total_duration
                print(f"[WARN] Video too short ({total_duration}s). Using entire video as highlight.")
        elif (stop - start) < 90 and last_result:
            # 마지막 결과가 90초 미만 → 그대로 사용
            start, stop = last_result
            duration = stop - start
            print(f"\n[WARN] Using short highlight as fallback: {start}s-{stop}s ({duration}s)")
            print("  (3 retries completed, accepting < 90s segment)")
                # Try to extend the segment while keeping content quality
            video_clip = VideoFileClip(input_video_path)
            total_duration = video_clip.duration
            video_clip.close()
            # Extend to 120s if possible
            new_stop = min(start + 120, total_duration)
            if new_stop > start + 90:
                stop = new_stop
                print(f"Extended to: {start}s - {stop}s ({stop-start}s)")
            else:
                # Not enough content, just use what we have
                pass

    start = float(start)
    stop = float(stop)

    if stop <= start:
        raise ValueError(f"Invalid highlight range: start={start}, stop={stop}")

    # 3) Cut clip (no audio)
    crop_video(input_video_path, temp_clip, start, stop)

    # 4) Crop to vertical
    if on_progress:
        on_progress(4, TOTAL_STEPS, "VIDEO_CROP")
    ok = crop_to_vertical(temp_clip, temp_cropped)
    if ok is False or (not os.path.exists(temp_cropped)):
        raise RuntimeError("crop_to_vertical failed (no output)")

    # 5) Subtitles (optional)
    if on_progress:
        on_progress(5, TOTAL_STEPS, "SUBTITLE_PROCESSING")
    if need_subtitles:
        # 쇼츠 구간(start~stop)에 해당하는 자막만 필터링
        shorts_transcriptions = []
        shorts_duration = stop - start
        
        for text, seg_start, seg_end in transcriptions:
            seg_start, seg_end = float(seg_start), float(seg_end)
            
            # 구간이 쇼츠와 겹치면 포함
            if seg_end <= start or seg_start >= stop:
                continue  # 겹치지 않으면 스킵
            
            # 원본 기준으로 겹치는 구간 계산
            overlap_start = max(seg_start, start)
            overlap_end = min(seg_end, stop)
            
            # 쇼츠 타임라인으로 변환 (0부터 시작)
            new_start = overlap_start - start
            new_end = overlap_end - start
            
            # 타임스탐프 유효성 확인
            if new_end > new_start and new_end > 0:
                text_strip = (text or "").strip()
                if text_strip:
                    shorts_transcriptions.append([text_strip, new_start, new_end])
        
        print(f"[Subtitles] Filtered {len(shorts_transcriptions)} subtitle segments for shorts")
        
        add_subtitles_to_video(
            input_video=temp_cropped,
            output_video=temp_subtitled,
            transcriptions=shorts_transcriptions,
            video_start_time=0,  # 이미 쇼츠 타임라인이므로 offset 필요 없음
            subtitle_lang=subtitle_lang,
            source_lang=source_lang,
            font_path=DEFAULT_KO_FONT,
            translate_fn=None,
        )
        video_for_final = temp_subtitled if os.path.exists(temp_subtitled) else temp_cropped
        has_subtitles = True
    else:
        video_for_final = temp_cropped
        has_subtitles = False

    # 6) Final output path
    clean_title = clean_filename(video_title or os.path.splitext(os.path.basename(input_video_path))[0])
    final_path = os.path.join(out_dir, f"{clean_title}_{job_id}_{video_id}_short.mp4")

    # 6) Combine audio
    if on_progress:
        on_progress(6, TOTAL_STEPS, "AUDIO_COMBINE")
    #  IMPORTANT:
    # - combine_videos()는 "오디오 있는 비디오"에서 audio를 꺼내 붙이므로,
    #   temp_clip이 audio=False로 만들어졌다면 temp_clip에는 오디오가 없음.
    # - 따라서 audio source는 input_video_path(원본)이어야 안전함.
    combine_videos(input_video_path, video_for_final, final_path)

    # 8) Meta
    with VideoFileClip(final_path) as v:
        duration = float(v.duration)
        resolution = f"{v.w}x{v.h}"

    # 7) Title generation
    if on_progress:
        on_progress(7, TOTAL_STEPS, "TITLE_GENERATION")
    highlight_text = _extract_highlight_text(transcriptions, start, stop)
    titles = generate_titles_stub(highlight_text, lang=subtitle_lang)

    # cleanup temp files
    print("[Cleanup] Removing temporary files...")
    time.sleep(1)  # 파일이 모두 닫힐 때까지 대기
    
    temp_files = [wav_path, temp_clip, temp_cropped, temp_subtitled]
    cleaned = 0
    for path in temp_files:
        if _safe_remove(path, verbose=True):
            cleaned += 1
    
    print(f"[Cleanup] Completed: {cleaned}/{len(temp_files)} files removed\n")

    return {
        "video_id": video_id,
        "input_video_path": input_video_path,
        "short": {
            "file_path": final_path,
            "duration_sec": duration,
            "resolution": resolution,
            "has_subtitles": has_subtitles,
        },
        "highlight": {
            "start_sec": start,
            "end_sec": stop,
            "reason": "Backend preselected 10min chunk; LLM picked highlight inside",
        },
        "titles": titles,
    }


def process_job(
    input_video_paths: List[str],
    need_subtitles: bool,
    subtitle_lang: str,
    job_id: Optional[str] = None,
    output_root: str = "./outputs",
    work_root: str = "./work",
    video_titles: Optional[List[str]] = None,
):
    """Generator로 변경됨 - 각 비디오 처리 완료 시마다 yield (JSONLines 스트리밍용)"""
    import json
    
    job_id = job_id or str(uuid.uuid4())[:8]
    t0 = datetime.now(timezone.utc)
    errors = []

    for idx, path in enumerate(input_video_paths, start=1):
        vid = f"v{idx}"
        title = None
        if video_titles and idx - 1 < len(video_titles):
            title = video_titles[idx - 1]

        try:
            r = process_one_video(
                input_video_path=path,
                video_id=vid,
                job_id=job_id,
                need_subtitles=need_subtitles,
                subtitle_lang=subtitle_lang,
                output_root=output_root,
                work_root=work_root,
                video_title=title,
            )
            # 각 비디오 완료 시마다 즉시 반환 (스트리밍)
            dt = datetime.now(timezone.utc) - t0
            yield json.dumps({
                "job_id": job_id,
                "video_id": vid,
                "status": "completed",
                "result": r,
                "processing_time_sec": round(dt.total_seconds(), 3),
            }) + "\n"
        except Exception as e:
            error_msg = f"{vid}: {type(e).__name__}: {e}"
            errors.append(error_msg)
            dt = datetime.now(timezone.utc) - t0
            yield json.dumps({
                "job_id": job_id,
                "video_id": vid,
                "status": "error",
                "error": error_msg,
                "processing_time_sec": round(dt.total_seconds(), 3),
            }) + "\n"

    # 모든 비디오 처리 완료 후 최종 요약
    dt = datetime.now(timezone.utc) - t0
    final_status = "success" if not errors else ("partial_success" if len(errors) < len(input_video_paths) else "failed")
    yield json.dumps({
        "job_id": job_id,
        "type": "summary",
        "status": final_status,
        "meta": {
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "total_processing_time_sec": round(dt.total_seconds(), 3),
            "shorts_count": len(input_video_paths) - len(errors),
            "error_count": len(errors),
        },
        "errors": errors or None,
    }) + "\n"

