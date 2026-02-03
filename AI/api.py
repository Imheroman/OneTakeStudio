import os
import json
import httpx
import asyncio
import uuid
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from fastapi import FastAPI, BackgroundTasks, HTTPException
# pipeline.py에서 정의한 함수 임포트
from pipeline import process_one_video

app = FastAPI(title="AI Shorts Generator API")

# ---------------------------------------------------------
# 📋 요청 데이터 모델 (사용자 제시 JSON 구조 반영)
# ---------------------------------------------------------
class VideoItem(BaseModel):
    video_id: str
    video_path: str

class ShortsRequest(BaseModel):
    job_id: Optional[str] = None
    videos: List[VideoItem]
    need_subtitles: bool = True
    subtitle_lang: str = "ko"
    output_dir: str  # 예: /mnt/output/abc123
    webhook_url: str # 결과 보고용 백엔드 주소

# ---------------------------------------------------------
# ⚙️ 백그라운드 처리 로직
# ---------------------------------------------------------
async def background_process_job(req: ShortsRequest):
    job_id = req.job_id or str(uuid.uuid4())[:8]
    work_root = "./work"
    t_start = datetime.now(timezone.utc)

    async with httpx.AsyncClient(timeout=60.0) as client:
        for video in req.videos:
            v_start = datetime.now(timezone.utc)

            # progress webhook을 보내는 동기 콜백 (run_in_executor 내 thread에서 호출됨)
            def make_progress_callback(vid_id, wh_url):
                sync_client = httpx.Client(timeout=10.0)
                def on_progress(step, total_steps, step_key):
                    try:
                        sync_client.post(wh_url, json={
                            "job_id": job_id,
                            "video_id": vid_id,
                            "status": "progress",
                            "step": step,
                            "total_steps": total_steps,
                            "step_key": step_key,
                        })
                    except Exception as err:
                        print(f"[WARN] Progress webhook failed (step {step}): {err}")
                return on_progress
            progress_cb = make_progress_callback(video.video_id, req.webhook_url)

            try:
                # [핵심] pipeline.py의 process_one_video 호출
                # 동기 함수이므로 run_in_executor로 비동기 실행
                loop = asyncio.get_event_loop()
                result_data = await loop.run_in_executor(
                    None,
                    lambda: process_one_video(
                        input_video_path=video.video_path,
                        video_id=video.video_id,
                        job_id=job_id,
                        need_subtitles=req.need_subtitles,
                        subtitle_lang=req.subtitle_lang,
                        source_lang="ko",
                        output_root=req.output_dir,
                        work_root=work_root,
                        on_progress=progress_cb,
                    )
                )

                v_end = datetime.now(timezone.utc)
                processing_time = round((v_end - v_start).total_seconds(), 3)

                # 성공 시 페이로드 구성
                webhook_payload = {
                    "job_id": job_id,
                    "video_id": video.video_id,
                    "status": "completed",
                    "result": result_data, # pipeline.py가 반환한 상세 정보 전체
                    "processing_time_sec": processing_time
                }

            except Exception as e:
                v_end = datetime.now(timezone.utc)
                webhook_payload = {
                    "job_id": job_id,
                    "video_id": video.video_id,
                    "status": "error",
                    "error": f"{type(e).__name__}: {str(e)}",
                    "processing_time_sec": round((v_end - v_start).total_seconds(), 3)
                }

            # 🚀 영상 하나 끝날 때마다 즉시 웹훅 전송
            try:
                print(f"[INFO] Sending webhook for {video.video_id}...")
                await client.post(req.webhook_url, json=webhook_payload)
            except Exception as err:
                print(f"[ERROR] Webhook failed: {err}")

        # 모든 작업 완료 후 최종 요약 웹훅 (필요 시)
        total_time = round((datetime.now(timezone.utc) - t_start).total_seconds(), 3)
        summary_payload = {
            "job_id": job_id,
            "type": "summary",
            "total_processing_time_sec": total_time,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        await client.post(req.webhook_url, json=summary_payload)

# ---------------------------------------------------------
# 🚀 API 엔드포인트
# ---------------------------------------------------------
@app.post("/shorts/process")
async def shorts_process(req: ShortsRequest, background_tasks: BackgroundTasks):
    # 1. 파일 존재 여부 간단 체크 (선택)
    for video in req.videos:
        print(f"[INFO] File check: {video.video_path}")
        print(f"[INFO] Exists: {os.path.exists(video.video_path)}")
        if not os.path.exists(video.video_path):
            raise HTTPException(status_code=400, detail=f"File not found: {video.video_path}")

    # 2. 백그라운드 태스크 등록 (즉시 리턴하기 위함)
    background_tasks.add_task(background_process_job, req)

    # 3. 백엔드에는 접수 확인 응답만 보냄
    return {
        "status": "accepted",
        "job_id": req.job_id or "generating",
        "message": f"Processing {len(req.videos)} videos in background."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)