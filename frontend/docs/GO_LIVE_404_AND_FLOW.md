# Go Live 404 원인 및 송출 플로우

## 404가 나는 이유 (YouTube API 아님)

- **Go Live 버튼은 YouTube API를 직접 호출하지 않습니다.**
- 프론트 → **우리 API 게이트웨이(60000)** → **Media 서비스** 로 `POST /api/v1/media/publish` 를 보냅니다.
- 404는 **그 요청이 게이트웨이에서 라우팅되지 않거나, Media까지 전달됐는데 경로가 맞지 않을 때** 나는 현상입니다.

### 수정한 부분 (가능 원인)

- 게이트웨이 `RewritePath` 에서 **치환 문자열 앞에 공백**이 들어가 있으면, Media로 전달되는 path가 ` /api/media/publish` 처럼 앞에 공백이 붙을 수 있습니다.
- Media 컨트롤러는 `@RequestMapping("/api/media/publish")` 이라 **앞에 공백이 있으면 매칭되지 않아 404** 가 납니다.
- `application.yml` 에서 RewritePath 치환 부분의 **공백을 제거**해 두었습니다.  
  → **API 게이트웨이 재시작** 후 다시 Go Live 를 눌러보세요.

### 그래도 404가 나면 확인할 것

1. **Eureka + Media 서비스 기동**
   - 게이트웨이는 `lb://media-service` 로 보내므로, **Eureka 서버**와 **Media 서비스**가 떠 있어야 합니다.
   - Media가 Eureka에 등록되지 않았거나 꺼져 있으면 라우팅/연결 문제로 404가 날 수 있습니다.
2. **실제 요청 URL**
   - 브라우저 개발자 도구 → Network 에서 `POST http://localhost:60000/api/v1/media/publish` 인지 확인.

---

## 송출 플로우 (YouTube와의 관계)

| 단계 | 주체 | 설명 |
|------|------|------|
| 1 | 프론트 | Go Live 클릭 → `POST /api/v1/media/publish` (studioId, destinationIds) |
| 2 | API 게이트웨이 | 요청을 Media 서비스로 전달 (path 재작성: `/api/media/publish`) |
| 3 | Media 서비스 | Core 서비스에서 채널 정보(RTMP URL, streamKey) 조회 |
| 4 | Media 서비스 | LiveKit Egress 로 **RTMP 푸시** 시작 (YouTube/Twitch 등이 제공하는 RTMP 주소로) |
| 5 | YouTube 등 | RTMP 수신 → 라이브 스트림으로 변환 (플랫폼 쪽 처리) |

- **YouTube Data API / OAuth** 는 **채널 연결(연동)** 할 때만 쓰고,
- **실제 송출(Go Live)** 은 **RTMP** 로 이루어지며, 우리 백엔드(Media)가 RTMP URL 로 푸시하는 구조입니다.
- 따라서 **404는 “YouTube API 호출 실패”가 아니라, “우리 게이트웨이/Media 경로 또는 기동 상태 문제”** 로 보면 됩니다.
