from moviepy.editor import VideoFileClip, CompositeVideoClip, ImageClip
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
from Components.Translate import translate_lines_batch
import re

DEFAULT_KO_FONT = r"C:\Windows\Fonts\malgun.ttf"

def _get_font_path(lang: str) -> str:
    """
    언어별 기본 글꼴 경로 반환
    """
    fonts = {
        "ko": r"C:\Windows\Fonts\malgun.ttf",        # 말근고딕
        "en": r"C:\Windows\Fonts\arial.ttf",          # Arial
        "zh": r"C:\Windows\Fonts\msyh.ttf",           # 마이크로소프트 야훼
        "ja": r"C:\Windows\Fonts\msgothic.ttf",        # 백백 고식
    }
    return fonts.get(lang, DEFAULT_KO_FONT)


def _is_korean_text(s: str) -> bool:
    return bool(re.search(r"[가-힣]", s or ""))

def _wrap_text_by_pixels(draw, text, font, max_width, stroke_width=0):
    """
    픽셀 폭(max_width) 기준으로 줄바꿈.
    한국어처럼 공백이 적어도 깨지지 않도록 '문자 단위'로도 안전하게 끊습니다.
    """
    text = (text or "").strip()
    if not text:
        return ""

    lines = []
    for paragraph in text.split("\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            lines.append("")
            continue

        current = ""
        for ch in paragraph:
            trial = current + ch
            bbox = draw.textbbox((0, 0), trial, font=font, stroke_width=stroke_width)
            w = bbox[2] - bbox[0]

            if w <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                    current = ch
                else:
                    # 폰트가 너무 커서 한 글자도 못 들어가는 경우
                    lines.append(ch)
                    current = ""

        if current:
            lines.append(current)

    # 연속 공백/빈 줄 정리(선택)
    return "\n".join(lines).strip()


def _render_text_image(
    text,
    video_w,
    video_h,
    font_path,
    font_size,
    fill=(255, 255, 255, 255),
    stroke_fill=(0, 0, 0, 255),
    stroke_width=4,
    margin_x=80,
    margin_bottom=None,
    auto_shrink=True,
    min_font_size=18,
):
    """
    투명 배경 RGBA 이미지에 자막을 그려서 numpy array 반환
    - 좌/우 잘림 방지: 픽셀 폭 기준 줄바꿈 + 필요시 폰트 축소
    """
    text = (text or "").strip()
    if not text:
        return None

    if not font_path or not os.path.exists(font_path):
        raise FileNotFoundError(f"Font not found: {font_path}")

    if margin_bottom is None:
        margin_bottom = int(video_h * 0.24)  # 하단 여백: 높이의 12%

    img = Image.new("RGBA", (video_w, video_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    max_text_width = max(50, video_w - (margin_x * 2))

    cur_size = int(font_size)

    while True:
        font = ImageFont.truetype(font_path, cur_size)

        wrapped = _wrap_text_by_pixels(
            draw=draw,
            text=text,
            font=font,
            max_width=max_text_width,
            stroke_width=stroke_width
        )

        bbox = draw.multiline_textbbox(
            (0, 0),
            wrapped,
            font=font,
            stroke_width=stroke_width,
            align="center"
        )
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

        # 폭이 마진 안에 들어오면 OK
        if text_w <= max_text_width:
            break

        if (not auto_shrink) or (cur_size <= min_font_size):
            break

        cur_size -= 2  # 폰트 조금씩 줄이기

    x = (video_w - text_w) // 2
    x = max(margin_x, min(x, video_w - margin_x - text_w))

    
    y = video_h - margin_bottom - text_h
    y = max(0, y)

    draw.multiline_text(
        (x, y),
        wrapped,
        font=font,
        fill=fill,
        stroke_fill=stroke_fill,
        stroke_width=stroke_width,
        align="center"
    )

    return np.array(img)


def add_subtitles_to_video(
    input_video,
    output_video,
    transcriptions,
    video_start_time=0,
    subtitle_lang="ko",     # 표시 언어
    source_lang="ko",       # STT 언어
    font_path=None,         # None이면 언어 기반 자동 선택
    translate_fn=None,
):
    """
    transcriptions: [[text, start, end], ...] (원본 타임라인 기준)
    video_start_time: 하이라이트 시작(원본 기준). 이만큼 빼서 현재 clip 타임라인에 맞춤.
    """
    # font_path 기본값 지정 (언어별)
    if font_path is None:
        font_path = _get_font_path(subtitle_lang)
    
    video = VideoFileClip(input_video)
    w, h = video.size
    dur = float(video.duration)

    relevant = []
    for text, start, end in transcriptions:
        s = float(start) - float(video_start_time)
        e = float(end) - float(video_start_time)

        if e <= 0 or s >= dur:
            continue

        s = max(0.0, s)
        e = min(dur, e)
        if e <= s:
            continue

        t = (text or "").strip()
        if not t:
            continue

        relevant.append((t, s, e))

    # 단 한 번만 번역 (중복 번역 제거)
    if subtitle_lang != source_lang and relevant:
        print(f"[Subtitles] Translating {len(relevant)} segments to {subtitle_lang}...")
        original_lines = [t for (t, _, _) in relevant]
        try:
            translated_lines = translate_lines_batch(
                original_lines,
                target_lang=subtitle_lang,
                source_lang=source_lang,
                model_name="gpt-4o-mini"
            )
        except Exception as ex:
            print(f"[Subtitles] Translation failed: {ex}, using original")
            translated_lines = None

        new_relevant = []
        for (orig_t, s, e), tr in zip(relevant, translated_lines or []):
            tr = (tr or "").strip()
            if tr:
                new_relevant.append((tr, s, e))

        relevant = new_relevant

    # 번역 후 relevant가 비면 -> 자막 없는 처리
    if not relevant:
        print("[Subtitles] No subtitles after translation -> writing original video")
        video.write_videofile(
            output_video, 
            codec="h264_nvenc",
            audio_codec="aac",
            preset="fast",
            verbose=False,
            logger=None
        )
        video.close()
        return

    
    font_size = max(16, int(h * 0.035))

    # 자막 텍스트 렌더링 캐시 (메모리 효율)
    subtitle_cache = {}
    
    def get_subtitle_frame(t):
        """자막 텍스트를 이미지로 렌더링 (캐시됨)"""
        if t not in subtitle_cache:
            try:
                img = _render_text_image(
                    t, w, h,
                    font_path=font_path,
                    font_size=font_size,
                    fill=(255, 255, 255, 255),
                    stroke_fill=(0, 0, 0, 255),
                    stroke_width=4,
                    margin_x=int(w * 0.06),
                    margin_bottom=int(h * 0.24),
                    auto_shrink=True,
                    min_font_size=18,
                )
                subtitle_cache[t] = img
            except Exception as err:
                print(f"[Subtitles] render failed for '{t}': {err}")
                subtitle_cache[t] = None
        return subtitle_cache[t]

    subtitle_clips = []
    for t, s, e in relevant:
        img = get_subtitle_frame(t)
        if img is None:
            continue

        clip = (ImageClip(img, ismask=False)
                .set_start(s)
                .set_duration(e - s)
                .set_position((0, 0)))
        subtitle_clips.append(clip)

    if not subtitle_clips:
        print("[Subtitles] WARNING: 0 subtitle clips rendered -> writing original video")
        video.write_videofile(
            output_video, 
            codec="h264_nvenc",  # GPU 가속 (NVIDIA)
            audio_codec="aac",
            preset="fast",
            verbose=False,
            logger=None
        )
        video.close()
        return

    final = CompositeVideoClip([video] + subtitle_clips)
    
    print("[Subtitles] Writing video with GPU acceleration (NVIDIA NVENC)...")
    final.write_videofile(
        output_video,
        codec="h264_nvenc",  # GPU 가속 인코딩 (RTX 4050 지원)
        audio_codec="aac",
        fps=video.fps or 30,
        preset="fast",  # GPU에서도 지원 (fast/medium/slow)
        verbose=False,
        logger=None
    )

    video.close()
    final.close()
    print(f"Subtitles added successfully (GPU accelerated) -> {output_video}")