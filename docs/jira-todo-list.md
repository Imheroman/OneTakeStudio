# Backend 개발 작업 일지 (Jira TODO)

## 2026-02-01 (토)

### AI 숏츠 생성 시스템
- [x] AI 숏츠 생성 API 구현 (`POST /api/shorts`)
- [x] 작업 상태 조회 API 구현 (`GET /api/shorts/{jobId}`)
- [x] 녹화별/스튜디오별/내 작업 목록 조회 API 구현
- [x] AI 콜백 수신 API 구현 (`POST /api/callback/ai-result`)
- [x] ShortsJob 엔티티 및 Repository 생성
- [x] AiServiceClient 구현 (AI 서버 연동)
- [x] AI 숏츠 API 통합 테스트 작성 (9개 테스트 통과)

### 채팅 연동 시스템
- [x] YouTube Live Chat API 연동 구현
  - REST API 폴링 방식
  - OAuth 토큰 자동 갱신
  - 메시지 파싱 및 전송
- [x] 치지직(Chzzk) 채팅 연동 구현
  - WebSocket 기반 연결
  - 채널 정보 API 조회
  - PING/PONG 처리
  - 실시간 메시지 파싱
- [x] Twitch 관련 코드 전체 삭제
  - TwitchChatClient 삭제
  - ChatPlatform에서 TWITCH 제거
  - ViewerService에서 Twitch 관련 로직 제거
- [x] 채팅 연동 API 통합 테스트 작성 (10개 테스트 통과)
- [x] 채팅 시스템 문서 작성

### 테스트 환경 구성
- [x] H2 인메모리 DB 테스트 환경 설정
- [x] application-test.yml 구성
- [x] Eureka 비활성화 설정

---

## 2026-01-31 (금)

### 분당 댓글 수 집계 기능
- [x] CommentCounterService 구현
  - 스튜디오별 분당 댓글 카운팅
  - 스레드 안전 ConcurrentHashMap 사용
  - 1분 간격 자동 집계
- [x] StreamService에 CommentCounterService 연동
  - 스트림 시작 시 카운터 시작
  - 스트림 종료 시 카운터 종료
- [x] RecordingService에 댓글 수 저장 연동

### URL 리팩토링
- [x] Gateway URL에서 v1 버전 제거
- [x] 각 서비스 URL에서 v1 버전 제거

### participant_joined 이벤트
- [x] LiveKit participant_joined 이벤트 처리 추가

---

## 2026-01-30 (목)

### LiveKit Egress/Ingress
- [x] Egress 기능 구현 (녹화 내보내기)
- [x] Ingress 기능 구현 (외부 스트림 수신)
- [x] 다중 채널 송출 기능 구현

### 채널 관리
- [x] 채널 수정/삭제 기능 버그 수정
- [x] 스튜디오 채널 조회 API 개선

---

## 2026-01-29 (수)

### 녹화 시스템
- [x] 녹화 시작/종료 API 구현
- [x] 녹화 세션 관리 로직 구현
- [x] 녹화 파일 경로 관리

### 스트리밍 시스템
- [x] 스트림 세션 관리 구현
- [x] 스트림 상태 변경 처리
- [x] 다중 플랫폼 송출 준비

### 채팅 기본 구조
- [x] ChatService 기본 구조 구현
- [x] ChatIntegrationService 구현
- [x] 외부 플랫폼 채팅 클라이언트 인터페이스 정의

---

## 커밋 히스토리 요약

| 날짜 | 브랜치 | 주요 커밋 |
|------|--------|-----------|
| 2026-02-01 | be-ai, be-chat | AI 숏츠 생성 API, 채팅 연동 구현, Twitch 제거 |
| 2026-01-31 | be-ai | 분당 댓글 수 집계, URL 리팩토링 |
| 2026-01-30 | be-ai | LiveKit Egress/Ingress, 채널 수정 |
| 2026-01-29 | be-ai | 녹화/스트리밍 기본 구조 |

---

## 테스트 결과 요약

| 모듈 | 테스트 수 | 성공 | 실패 |
|------|-----------|------|------|
| 채팅 연동 | 10 | 10 | 0 |
| AI 숏츠 | 9 | 9 | 0 |
| **합계** | **19** | **19** | **0** |

---

## 생성된 문서 목록

- `docs/chat/README.md` - 채팅 시스템 전체 문서
- `docs/chat/stream-comment-counter-integration.md` - StreamService 연동 문서
- `docs/chat/youtube-chat-integration.md` - YouTube 연동 문서
- `docs/chat/chzzk-chat-integration.md` - 치지직 연동 문서
- `docs/chat/test-report.md` - 채팅 테스트 보고서
- `docs/shorts/test-report.md` - AI 숏츠 테스트 보고서
