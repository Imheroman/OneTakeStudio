import requests
import os

# 1. AI 서버 주소
AI_SERVER_URL = "http://localhost:8000/shorts/process"

# 2. 테스트용 경로 설정 (본인의 환경에 맞게 수정하세요)
# 예: "C:/Users/Name/Desktop/test.mp4" (Windows) 또는 "/home/user/test.mp4" (Linux)
input_video = "C:/Users/SSAFY/Desktop/공통 프로젝트/S14P11C206/AI-Youtube-Shorts-Generator/AI/test_mnt/input/v1.mp4"
output_directory = "C:/Users/SSAFY/Desktop/공통 프로젝트/S14P11C206/AI-Youtube-Shorts-Generator/AI/test_mnt/output/test_job_1"

# 3. 보낼 데이터 (JSON)
payload = {
    "job_id": "test_job_123",
    "videos": [
        {
            "video_id": "v1",
            "video_path": input_video
        }
    ],
    "need_subtitles": True,
    "subtitle_lang": "ko",
    "output_dir": output_directory,
    "webhook_url": "http://localhost:9000/callback" # 가짜 백엔드 주소
}

def send_request():
    print(f"🚀 AI 서버({AI_SERVER_URL})에 요청을 보냅니다...")
    
    try:
        # JSON 형식으로 POST 요청 전송
        response = requests.post(AI_SERVER_URL, json=payload)
        
        if response.status_code == 200:
            print("✅ 요청 성공!")
            print(f"📦 서버 응답: {response.json()}")
            print("\n이제 AI 서버 터미널과 가짜 백엔드 터미널을 확인하세요.")
        else:
            print(f"❌ 요청 실패 (상태 코드: {response.status_code})")
            print(f"📝 에러 내용: {response.text}")
            
    except Exception as e:
        print(f"💥 에러 발생: {e}")

if __name__ == "__main__":
    send_request()