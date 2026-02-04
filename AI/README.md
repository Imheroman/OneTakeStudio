# AI README

## 실행 방법

```text
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
python main.py "경로"
```

    # [Step 1] 전체 오디오 추출 및 변환
    # [Step 2] 하이라이트 구간 선정 (LLM)
    # [Step 3] 사용자 승인 (윈도우 호환 15초 타이머)
    # [Step 4] 영상 처리 시작
        # 4-1. 점프컷(무음 제거) 계획 수립
        # 4-2. 조각 영상 자르기 및 합치기
        # 4-3. 세로 화면(9:16) 얼굴 크롭
        # 4-4. 자막 싱크 재보정 (Re-transcription)
        # 4-5. 자막 입히기
        # 4-6. 최종 오디오 병합 (오디오 + 영상)

# 테스트용 서버 테스트 완료
```text
테스트 방법
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
cd AI
uvicorn api:app --host 0.0.0.0 --port 8000 (AI 서버 켜기)
새 터미널 창에서 >>> python webhook_test.py (테스트용 백엔드 서버 실행)
또 다른 터미널 창에서 >>> python send_test.py (요청)
```

