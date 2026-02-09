from moviepy.editor import VideoFileClip

def extractAudio(video_path, audio_path="audio.wav"):
    """
    main.py에서 import 하는 함수명 고정: extractAudio
    오디오 트랙이 없는 영상이면 None 반환
    """
    try:
        video_clip = VideoFileClip(video_path)
        if video_clip.audio is None:
            print(f"[WARN] No audio track in video: {video_path}")
            video_clip.close()
            return None
        video_clip.audio.write_audiofile(audio_path)
        video_clip.close()
        print(f"Extracted audio to: {audio_path}")
        return audio_path
    except Exception as e:
        print(f"An error occurred while extracting audio: {e}")
        return None


def crop_video(input_file, output_file, start_time, end_time):
    """
    main.py에서 import 하는 함수명 고정: crop_video
    - moviepy subclip으로 앞뒤 자르기
    """
    with VideoFileClip(input_file) as video:
        max_time = video.duration - 0.1
        if end_time > max_time:
            print(f"Warning: end_time({end_time}) > duration({video.duration}). Capping to {max_time}")
            end_time = max_time

        if start_time < 0:
            start_time = 0

        if end_time <= start_time:
            raise ValueError(f"Invalid time range: start={start_time}, end={end_time}")

        cropped = video.subclip(start_time, end_time)
        cropped.write_videofile(output_file, codec="libx264")
