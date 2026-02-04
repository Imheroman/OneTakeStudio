"""
Mock AI Server for Integration Testing
GPU 없이 백엔드 통합 테스트를 위한 가짜 AI 서버
- POST /shorts/process 요청을 받으면 즉시 accepted 응답
- 3초 후 webhook으로 성공 결과 전송
"""
import asyncio
import httpx
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Mock AI Shorts Generator")


class VideoItem(BaseModel):
    video_id: str
    video_path: str


class ShortsRequest(BaseModel):
    job_id: Optional[str] = None
    videos: List[VideoItem]
    need_subtitles: bool = True
    subtitle_lang: str = "ko"
    output_dir: str
    webhook_url: str


PROGRESS_STEPS = [
    "AUDIO_EXTRACTION",
    "TRANSCRIPTION",
    "HIGHLIGHT_SELECTION",
    "VIDEO_CROP",
    "SUBTITLE_PROCESSING",
    "AUDIO_COMBINE",
    "TITLE_GENERATION",
]


async def mock_process_job(req: ShortsRequest):
    """각 영상에 대해 7단계 progress webhook 후 성공 webhook 전송"""
    job_id = req.job_id or str(uuid.uuid4())[:8]

    # output 디렉토리 생성
    os.makedirs(req.output_dir, exist_ok=True)

    async with httpx.AsyncClient(timeout=30.0) as client:
        for video in req.videos:
            print(f"[Mock] Processing {video.video_id}...")

            # 7단계 progress webhook 전송
            for idx, step_key in enumerate(PROGRESS_STEPS, start=1):
                progress_payload = {
                    "job_id": job_id,
                    "video_id": video.video_id,
                    "status": "progress",
                    "step": idx,
                    "total_steps": len(PROGRESS_STEPS),
                    "step_key": step_key,
                }
                try:
                    await client.post(req.webhook_url, json=progress_payload)
                    print(f"[Mock] Progress {idx}/{len(PROGRESS_STEPS)}: {step_key}")
                except Exception as e:
                    print(f"[Mock] Progress webhook failed: {e}")
                await asyncio.sleep(0.5)  # 0.5초 간격

            # 가짜 output 파일 생성
            output_path = f"{req.output_dir}/{video.video_id}_short.mp4"
            with open(output_path, "wb") as f:
                f.write(b"MOCK_VIDEO_DATA")  # 더미 파일

            # 성공 webhook 페이로드 (API 명세서 + ai api.py 호환)
            webhook_payload = {
                "job_id": job_id,
                "video_id": video.video_id,
                "status": "completed",
                "result": {
                    "video_id": video.video_id,
                    "short": {
                        "file_path": output_path,
                        "duration_sec": 95.5,
                        "resolution": "1080x1920",
                        "has_subtitles": req.need_subtitles,
                    },
                    "highlight": {
                        "start_sec": 120.0,
                        "end_sec": 215.5,
                        "reason": "[Mock] 채팅 급증 구간 - 하이라이트 자동 선정"
                    },
                    "titles": [
                        "[Mock] 역대급 리액션 모음",
                        "[Mock] 이 순간을 놓치지 마세요",
                        "[Mock] 실시간 하이라이트"
                    ]
                },
                "processing_time_sec": 3.0
            }

            print(f"[Mock] Sending webhook for {video.video_id} -> {req.webhook_url}")
            try:
                resp = await client.post(req.webhook_url, json=webhook_payload)
                print(f"[Mock] Webhook response: {resp.status_code}")
            except Exception as e:
                print(f"[Mock] Webhook failed: {e}")

        # 최종 summary webhook
        summary_payload = {
            "job_id": job_id,
            "type": "summary",
            "total_processing_time_sec": 3.0 * len(req.videos),
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        try:
            await client.post(req.webhook_url, json=summary_payload)
            print(f"[Mock] Summary webhook sent")
        except Exception as e:
            print(f"[Mock] Summary webhook failed: {e}")


@app.get("/health")
async def health():
    return {"status": "ok", "mode": "mock"}


@app.post("/shorts/process")
async def shorts_process(req: ShortsRequest, background_tasks: BackgroundTasks):
    print(f"\n{'='*50}")
    print(f"[Mock] Received shorts request")
    print(f"[Mock] job_id: {req.job_id}")
    print(f"[Mock] videos: {len(req.videos)}")
    for v in req.videos:
        print(f"  - {v.video_id}: {v.video_path}")
    print(f"[Mock] webhook_url: {req.webhook_url}")
    print(f"{'='*50}\n")

    # 파일 존재 여부는 체크하지 않음 (mock이므로)
    background_tasks.add_task(mock_process_job, req)

    return {
        "status": "accepted",
        "job_id": req.job_id or "mock-job",
        "message": f"[Mock] Processing {len(req.videos)} videos in background."
    }


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("  Mock AI Server Starting on port 8000")
    print("  (For integration testing without GPU)")
    print("="*50 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
