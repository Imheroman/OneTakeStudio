import cv2
import numpy as np
from moviepy.editor import VideoFileClip, AudioFileClip
import subprocess
import os
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

global Fps
Fps = 30.0


def _fit_to_canvas(frame, canvas_w, canvas_h):
    h, w = frame.shape[:2]
    scale = min(canvas_w / w, canvas_h / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
    x0 = (canvas_w - new_w) // 2
    y0 = (canvas_h - new_h) // 2
    canvas[y0:y0 + new_h, x0:x0 + new_w] = resized
    return canvas


def _is_bottom_right_face(best_face, W, H, x_th=0.65, y_th=0.65):
    x, y, w, h = best_face
    cx = x + w / 2
    cy = y + h / 2
    return (cx > x_th * W) and (cy > y_th * H)


def crop_to_vertical(input_video_path, output_video_path,
                     scan_frames=300,
                     multi_ratio_th=0.20,
                     br_ratio_th=0.80):
    """
    main.py에서 import 하는 함수명 고정: crop_to_vertical
    규칙:
      - 얼굴 0명 => 전체화면
      - 얼굴 2명 이상 자주 => 전체화면
      - 얼굴이 우하단(PIP) 위주 => 전체화면
      - 그 외 => 얼굴 중심 static crop
    
    scan_frames: 얼굴 감지를 위해 스캔할 프레임 수 (높을수록 정확하지만 느림)
                 기본값 300 = ~10초 분량 (30fps 기준)
    """
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

    cap = cv2.VideoCapture(input_video_path, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return False

    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    vertical_h = H if H % 2 == 0 else H - 1
    vertical_w = int(vertical_h * 9 / 16)
    if vertical_w % 2 != 0:
        vertical_w -= 1
    print(f"Output dimensions: {vertical_w}x{vertical_h}")

    if W < vertical_w:
        print("Error: Original video width is less than desired vertical width.")
        cap.release()
        return False

    scan_n = min(scan_frames, total_frames)
    face_centers = []
    face_frames = 0
    multi_frames = 0
    br_frames = 0

    print(f"[FaceCrop] Scanning {scan_n} frames to analyze face positions...")
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    for idx in range(scan_n):
        ret, frame = cap.read()
        if not ret:
            break
        
        # 진행률 출력
        if (idx + 1) % max(1, scan_n // 5) == 0:
            progress = ((idx + 1) / scan_n) * 100
            print(f"  Scanning... {progress:.0f}% ({idx + 1}/{scan_n})")
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=8, minSize=(30, 30))

        if len(faces) == 0:
            continue

        face_frames += 1
        if len(faces) >= 2:
            multi_frames += 1

        best = max(faces, key=lambda f: f[2] * f[3])
        x, y, w, h = best
        cx = x + w // 2
        face_centers.append(cx)

        if _is_bottom_right_face(best, W, H):
            br_frames += 1

    print(f"[FaceCrop] Scan complete: {face_frames} frames with faces detected")

    if face_frames == 0:
        decision = "FULLFRAME_NO_FACE"
    else:
        multi_ratio = multi_frames / face_frames
        br_ratio = br_frames / face_frames
        if multi_ratio >= multi_ratio_th:
            decision = "FULLFRAME_MULTI_FACE"
        elif br_ratio >= br_ratio_th:
            decision = "FULLFRAME_BOTTOM_RIGHT"
        else:
            decision = "FACE_CROP"

    print(f"[FaceCrop] Decision: {decision}")

    x_start = 0
    if decision == "FACE_CROP":
        face_centers.sort()
        median_x = int(face_centers[len(face_centers) // 2])
        x_start = int(median_x - vertical_w / 2)
        x_start = max(0, min(x_start, W - vertical_w))

        margin = int(vertical_w * 0.08)
        x_start = max(0, min(x_start - margin, W - vertical_w))
        print(f"[FaceCrop] static x_start={x_start}")

    cap.release()

    global Fps
    Fps = fps

    # FFmpeg로 크롭 처리 (GPU NVENC 우선, 실패시 CPU)
    if decision == "FACE_CROP":
        crop_filter = f"crop={vertical_w}:{vertical_h}:{x_start}:0"
    else:
        # FULLFRAME: _fit_to_canvas 대체 - 원본을 세로 비율에 맞춰 패딩 (짝수 보장)
        crop_filter = f"scale={vertical_w}:{vertical_h}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad={vertical_w}:{vertical_h}:(ow-iw)/2:(oh-ih)/2:black"

    cmd_gpu = [
        FFMPEG, "-y",
        "-i", input_video_path,
        "-vf", crop_filter,
        "-c:v", "h264_nvenc",
        "-preset", "p4",
        "-an",
        output_video_path
    ]
    cmd_cpu = [
        FFMPEG, "-y",
        "-i", input_video_path,
        "-vf", crop_filter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-an",
        output_video_path
    ]

    print(f"[FaceCrop] FFmpeg processing ({decision})...")
    try:
        result = subprocess.run(cmd_gpu, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if result.returncode == 0:
            print(f"[FaceCrop] done (GPU) -> {output_video_path}")
            return True
        else:
            print(f"[FaceCrop] GPU failed, trying CPU...")
    except Exception as e:
        print(f"[FaceCrop] GPU error: {e}, trying CPU...")

    try:
        result = subprocess.run(cmd_cpu, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
        if result.returncode == 0:
            print(f"[FaceCrop] done (CPU) -> {output_video_path}")
            return True
        else:
            print(f"[FaceCrop] CPU also failed: {result.stderr.decode()[-500:]}")
            return False
    except Exception as e:
        print(f"[FaceCrop] Critical error: {e}")
        return False

def combine_videos(audio_input, video_input, output_filename):
    """
    audio_input: .wav (오디오) 또는 .mp4 (오디오가 있는 영상)
    video_input: .mp4 (소리가 없는 영상)
    output_filename: 저장할 경로
    """
    clip_video = None
    clip_audio = None
    combined_clip = None

    try:
        print(f"Combining: Audio({os.path.basename(audio_input)}) + Video({os.path.basename(video_input)})")

        # 1. 비디오 로드 (소리 없는 영상)
        clip_video = VideoFileClip(video_input)

        # 2. 오디오 로드 (입력이 .wav인지 .mp4인지 구분하여 처리)
        ext = os.path.splitext(audio_input)[1].lower()
        if ext in ['.wav', '.mp3', '.m4a']:
            # 순수 오디오 파일이면 AudioFileClip 사용
            clip_audio = AudioFileClip(audio_input)
        else:
            # 비디오 파일이면 오디오 추출
            temp_clip = VideoFileClip(audio_input)
            if temp_clip.audio is None:
                raise RuntimeError(f"No audio track found in {audio_input}")
            clip_audio = temp_clip.audio

        # 3. 길이 맞추기 (더 짧은 쪽에 맞춤 - 보통 오디오 기준)
        final_duration = min(clip_video.duration, clip_audio.duration)
        
        clip_video = clip_video.subclip(0, final_duration)
        clip_audio = clip_audio.subclip(0, final_duration)

        # 4. 합치기
        combined_clip = clip_video.set_audio(clip_audio)

        # 5. 저장 (MoviePy 사용)
        combined_clip.write_videofile(
            output_filename,
            codec="libx264",
            audio_codec="aac",
            fps=clip_video.fps if clip_video.fps else 30,
            preset="medium",   
            bitrate="5000k",
            verbose=False,
            logger=None
        )

        print(f"Combined video saved successfully: {output_filename}")

    except Exception as e:
        print(f"MoviePy failed: {str(e)}")
        print("Switching to FFmpeg fallback mode...")
        
        # [비상장치] MoviePy 실패 시 FFmpeg 명령어로 직접 처리
        try:
            # 절대 경로 변환
            abs_audio = os.path.abspath(audio_input)
            abs_video = os.path.abspath(video_input)
            abs_output = os.path.abspath(output_filename)

            cmd = [
                FFMPEG, "-y",
                "-i", abs_video,
                "-i", abs_audio,
                "-c:v", "copy",  # 비디오 복사 (화질저하 없음)
                "-c:a", "aac",   # 오디오 인코딩
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",     # 짧은 쪽에 맞춤
                abs_output
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            print(f"FFmpeg fallback success: {output_filename}")
        except Exception as ffmpeg_err:
             print(f"Critical Error in FFmpeg fallback: {ffmpeg_err}")

    finally:
        # 리소스 해제 (파일 잠김 방지)
        if clip_video: 
            try: clip_video.close()
            except: pass
        if clip_audio: 
            try: clip_audio.close()
            except: pass
        if combined_clip: 
            try: combined_clip.close()
            except: pass