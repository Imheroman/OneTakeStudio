from Components.YoutubeDownloader import download_youtube_video
from Components.Edit import extractAudio, crop_video
from Components.Transcription import transcribeAudio
from Components.LanguageTasks import GetHighlight
from Components.FaceCrop import crop_to_vertical, combine_videos
from Components.Subtitles import add_subtitles_to_video
from Components.Translate import translate_text
from Components.AudioProcessor import AudioProcessor

import sys
import os
import uuid
import re
import time
from datetime import datetime
import select

# ==========================================
# 1. 초기 설정 및 입력
# ==========================================
start_time = time.time()
print(f"RUNNING FILE: {__file__}")

session_id = str(uuid.uuid4())[:8]
print(f"Session ID: {session_id}")

auto_approve = "--auto-approve" in sys.argv
if auto_approve:
    sys.argv.remove("--auto-approve")

# 자막 언어 설정
subtitle_lang = input("Subtitle language (ko/en/ja/zh...): ").strip().lower()
if not subtitle_lang:
    subtitle_lang = "ko"

# 영상 소스 입력 (유튜브 URL 또는 로컬 파일)
if len(sys.argv) > 1:
    url_or_file = sys.argv[1]
else:
    url_or_file = input("Enter YouTube video URL or local video file path: ")

video_title = None
if os.path.isfile(url_or_file):
    print(f"Using local video file: {url_or_file}")
    Vid = url_or_file
    video_title = os.path.splitext(os.path.basename(url_or_file))[0]
else:
    print(f"Downloading from YouTube...")
    Vid = download_youtube_video(url_or_file)
    if Vid and Vid.endswith(".webm"):
        Vid = Vid.replace(".webm", ".mp4")
    if Vid:
        video_title = os.path.splitext(os.path.basename(Vid))[0]

def clean_filename(title):
    cleaned = title.lower()
    cleaned = re.sub(r'[<>:"/\\|?*\[\]]', '', cleaned)
    cleaned = re.sub(r'[\s_]+', '-', cleaned)
    return cleaned[:80]

# ==========================================
# 2. 메인 프로세스 시작
# ==========================================
if Vid:
    audio_file = f"audio_{session_id}.wav"
    temp_clip = f"temp_clip_{session_id}.mp4"      # 점프컷 완료된 영상 (가로, 소리 있음)
    temp_cropped = f"temp_cropped_{session_id}.mp4" # 세로 크롭된 영상 (소리 없음)
    temp_subtitled = f"temp_subtitled_{session_id}.mp4" # 자막 입혀진 영상 (소리 없음)
    
    # [Step 1] 전체 오디오 추출 및 변환
    Audio = extractAudio(Vid, audio_file)
    
    if Audio:
        transcriptions = transcribeAudio(Audio, language="ko")

        if len(transcriptions) > 0:
            # [Step 2] 하이라이트 구간 선정 (LLM)
            print("Analyzing transcription to find best highlight...")
            start, stop = GetHighlight(transcriptions)

            if start is None or stop is None:
                print("ERROR: Failed to get highlight")
                sys.exit(1)

            # [Step 3] 사용자 승인 (윈도우 호환 15초 타이머)
            approved = False
            
            if not auto_approve:
                while not approved:
                    duration_seg = stop - start
                    print(f"\n{'='*60}")
                    print(f"SELECTED SEGMENT DETAILS:")
                    print(f"Time: {start}s - {stop}s ({duration_seg:.1f}s duration)")
                    print(f"{'='*60}\n")

                    print("Options:")
                    print("  [Enter] Approve and continue")
                    print("  [r]     Regenerate selection")
                    print("  [n]     Cancel")
                    print("\n⏳ Waiting 15 seconds... (Auto-approve if no input)")

                    # --- 타임아웃 입력 감지 로직 ---
                    user_input = None
                    input_detected = False
                    start_wait = time.time()
                    timeout = 15

                    while True:
                        if time.time() - start_wait > timeout:
                            print("\n⏰ Timeout! Auto-approving selection...")
                            approved = True
                            break

                        is_data_ready = False
                        if sys.platform == 'win32':
                            import msvcrt
                            if msvcrt.kbhit():
                                is_data_ready = True
                        else:
                            ready, _, _ = select.select([sys.stdin], [], [], 0.1)
                            if ready:
                                is_data_ready = True

                        if is_data_ready:
                            user_input = sys.stdin.readline().strip().lower()
                            input_detected = True
                            break
                        
                        time.sleep(0.1)

                    if input_detected:
                        if user_input == 'r':
                            print("\n🔄 Regenerating selection...")
                            start, stop = GetHighlight(transcriptions)
                            if start is None: sys.exit(1)
                        elif user_input == 'n':
                            print("❌ Cancelled by user")
                            sys.exit(0)
                        else:
                            print("✅ Approved by user")
                            approved = True
            else:
                print(f"Auto-approved highlight: {start}s - {stop}s")

            # [Step 4] 영상 처리 시작
            if start >= 0 and stop > start:
                print(f"\n🚀 Processing Viral Short: {start}s - {stop}s")

                # 4-1. 점프컷(무음 제거) 계획 수립
                print("Step 1/5: Calculating Jump Cuts (Removing Silence)...")
                jump_cut_segments = AudioProcessor.generate_jump_cut_plan(
                    transcriptions, start, stop, max_silence=0.3
                )
                
                # 4-2. 조각 영상 자르기 및 합치기
                concat_list_path = f"concat_list_{session_id}.txt"
                temp_parts = []
                
                print(f"  ✂️ Slicing {len(jump_cut_segments)} parts for fast pacing...")
                for i, (seg_start, seg_end) in enumerate(jump_cut_segments):
                    part_filename = f"part_{session_id}_{i}.mp4"
                    temp_parts.append(part_filename)
                    crop_video(Vid, part_filename, seg_start, seg_end)

                with open(concat_list_path, "w", encoding='utf-8') as f:
                    for part in temp_parts:
                        abs_path = os.path.abspath(part).replace('\\', '/')
                        f.write(f"file '{abs_path}'\n")

                print("  🔗 Merging segments into one tight clip...")
                # temp_clip에는 소리가 포함되어 있음
                os.system(f"ffmpeg -f concat -safe 0 -i \"{concat_list_path}\" -c copy -y \"{temp_clip}\" -loglevel error")

                # 임시 파일 삭제
                for part in temp_parts:
                    if os.path.exists(part): os.remove(part)
                if os.path.exists(concat_list_path): os.remove(concat_list_path)

                # 4-3. 세로 화면(9:16) 얼굴 크롭
                print("Step 2/5: Cropping to vertical format (9:16)...")
                # temp_cropped는 OpenCV 처리로 인해 소리가 사라질 수 있음
                ok = crop_to_vertical(temp_clip, temp_cropped)
                if not ok:
                    print("ERROR: Vertical crop failed.")
                    sys.exit(1)

                # 4-4. 자막 싱크 재보정 (Re-transcription)
                print("Step 3/5: Syncing subtitles to Jump-Cut video...")
                print("  ↻ Re-transcribing final clip for perfect sync...")
                
                # 중요: 소리가 살아있는 'temp_clip'에서 오디오 추출
                temp_audio_final = f"audio_final_{session_id}.wav"
                extractAudio(temp_clip, temp_audio_final)
                
                final_transcriptions = transcribeAudio(temp_audio_final, language="ko")
                
                sub_data = []
                for text, s, e in final_transcriptions:
                    sub_data.append([text, float(s), float(e)])

                # 4-5. 자막 입히기
                print("Step 4/5: Burning subtitles...")
                add_subtitles_to_video(
                    temp_cropped, # 소리 없는 영상에 자막 입힘
                    temp_subtitled,
                    sub_data,
                    video_start_time=0,
                    subtitle_lang=subtitle_lang,
                    source_lang="ko",
                    font_path=r"C:\Windows\Fonts\malgun.ttf", # 폰트 경로 확인 필수
                    translate_fn=lambda t, lang: translate_text(t, target_lang=lang, source_lang="ko")
                )

                # 4-6. 최종 오디오 병합 (소리 살리기)
                clean_title = clean_filename(video_title) if video_title else "output"
                final_output = f"{clean_title}_{session_id}_short.mp4"

                print("Step 5/5: Finalizing audio...")
                
                # [안전장치] 한국어 제목 때문에 에러가 날 수 있으므로, 파일명을 영어로 강제 변경 시도
                # (원하는 경우 아래 output_name을 video_title 기반으로 해도 되지만, 테스트를 위해 영어 권장)
                output_name = f"shorts_output_{session_id}.mp4" 
                
                # combine_videos 함수 호출
                combine_videos(temp_audio_final, temp_subtitled, output_name)

                # =========================================================
                # [디버깅] 파일 위치 추적 및 존재 여부 확인
                # =========================================================
                abs_path = os.path.abspath(output_name)
                
                if os.path.exists(output_name) and os.path.getsize(output_name) > 0:
                    print(f"\n{'='*60}")
                    print(f"🎉 FINAL VIDEO CREATED SUCCESSFULLY!")
                    print(f"📂 Location: {abs_path}")
                    print(f"{'='*60}\n")
                    
                    # (선택) 윈도우라면 탐색기를 바로 열어줍니다.
                    if sys.platform == 'win32':
                        os.system(f'explorer /select,"{abs_path}"')
                else:
                    print(f"\n{'='*60}")
                    print(f"😱 ERROR: File was NOT created.")
                    print(f"ffmpeg failed at the final step. Likely an encoding/path issue.")
                    print(f"Check if you have write permissions or try a simpler filename.")
                    print(f"{'='*60}\n")
                
                # Cleanup (성공했을 때만 임시파일 지우기)
                if os.path.exists(output_name):
                    time.sleep(1)
                    for f in [audio_file, temp_clip, temp_cropped, temp_subtitled, temp_audio_final]:
                        if os.path.exists(f): 
                            try: os.remove(f)
                            except: pass

            else:
                print("Error: Invalid highlight range")
        else:
            print("No transcription found")
    else:
        print("No audio found")

end_time = time.time()
print(f"\nTotal Time: {end_time - start_time:.1f}s")