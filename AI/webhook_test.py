# webhook_test.py
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/callback")
async def callback(request: Request):
    data = await request.json()
    print("🔔 [백엔드] 웹훅 수신 완료!")
    print(f"📦 데이터: {data}")
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000) # 9000번 포트에서 대기