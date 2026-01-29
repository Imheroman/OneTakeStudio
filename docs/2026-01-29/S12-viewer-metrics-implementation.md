# S12: 실시간 시청 지표 모니터링 구현

## 날짜: 2026-01-29

---

## 개요

YouTube, Twitch, 치지직(Chzzk)에서 실시간 시청자 수를 수집하여 통합 모니터링하는 기능 구현

**기능명세서**: S12 (실시간 시청 지표 모니터링)

---

## 구현 내용

### 1. 시청 지표 수집
- 플랫폼별 실시간 시청자 수 (YouTube, Twitch, Chzzk)
- 최고 시청자 수 (Peak) 자동 추적
- 10초 주기 자동 수집 (`@Scheduled`)

### 2. 실시간 브로드캐스팅
- WebSocket으로 프론트엔드에 실시간 전송
- `/topic/metrics/{studioId}` 구독

### 3. 지표 저장 및 조회
- DB에 히스토리 저장 (viewer_metrics 테이블)
- 시간대별 통계 조회 API

---

## 생성된 파일 (11개)

### Phase 1: Entity
```
media-service/src/main/java/com/onetake/media/viewer/entity/
└── ViewerMetrics.java
```

### Phase 2: Repository
```
media-service/src/main/java/com/onetake/media/viewer/repository/
└── ViewerMetricsRepository.java
```

### Phase 3: DTO
```
media-service/src/main/java/com/onetake/media/viewer/dto/
├── ViewerMetricsResponse.java      (Aggregated, PlatformMetrics 내부 클래스 포함)
└── ViewerStatsResponse.java        (TimeSeriesData, PlatformStats 포함)
```

### Phase 4: 외부 클라이언트
```
media-service/src/main/java/com/onetake/media/viewer/integration/
├── ExternalViewerClient.java       ← 인터페이스
├── YouTubeViewerClient.java        ← TODO stub (mock 데이터 반환)
├── TwitchViewerClient.java         ← TODO stub (mock 데이터 반환)
└── ChzzkViewerClient.java          ← TODO stub (mock 데이터 반환)
```

### Phase 5: Service
```
media-service/src/main/java/com/onetake/media/viewer/service/
├── ViewerMetricsService.java           ← 비즈니스 로직 + WebSocket 브로드캐스트
└── ViewerMetricsIntegrationService.java ← 10초 스케줄러
```

### Phase 6: Controller
```
media-service/src/main/java/com/onetake/media/viewer/controller/
└── ViewerMetricsController.java
```

---

## 수정된 파일 (2개)

| 파일 | 변경 내용 |
|------|----------|
| `MediaServiceApplication.java` | `@EnableScheduling` 추가 |
| `ErrorCode.java` | V001~V003 추가 |

---

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/media/viewer/{studioId}/current` | 현재 시청 지표 (모든 플랫폼) |
| GET | `/api/media/viewer/{studioId}/aggregated` | 통합 시청 지표 |
| GET | `/api/media/viewer/{studioId}/platform/{platform}` | 플랫폼별 지표 |
| GET | `/api/media/viewer/{studioId}/total` | 통합 시청자 수 |
| GET | `/api/media/viewer/{studioId}/stats` | 시간대별 통계 |

### WebSocket
| 경로 | 설명 |
|------|------|
| `/topic/metrics/{studioId}` | 실시간 지표 구독 (10초마다 브로드캐스트) |

---

## 데이터베이스 테이블

### viewer_metrics (자동 생성)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT | PK (Auto Increment) |
| metrics_id | VARCHAR(36) | UUID (외부 노출용) |
| studio_id | BIGINT | 스튜디오 ID |
| platform | ENUM | YOUTUBE, TWITCH, CHZZK, INTERNAL |
| current_viewers | BIGINT | 현재 시청자 수 |
| peak_viewers | BIGINT | 최고 시청자 수 |
| recorded_at | DATETIME | 측정 시간 |
| created_at | DATETIME | 생성 시간 |
| updated_at | DATETIME | 수정 시간 |

**인덱스**:
- `idx_viewer_metrics_studio_platform` (studio_id, platform)
- `idx_viewer_metrics_studio_recorded` (studio_id, recorded_at)

---

## ErrorCode 추가

| 코드 | HTTP Status | 메시지 |
|------|-------------|--------|
| V001 | 404 NOT_FOUND | 시청 지표를 찾을 수 없습니다 |
| V002 | 409 CONFLICT | 이미 시청자 수집이 진행 중입니다 |
| V003 | 500 INTERNAL_SERVER_ERROR | 시청자 수집에 실패했습니다 |

---

## 핵심 구현 코드

### 1. ViewerMetrics Entity
```java
@Entity
@Table(name = "viewer_metrics")
public class ViewerMetrics extends BaseTimeEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "metrics_id", unique = true)
    private String metricsId;  // UUID

    private Long studioId;

    @Enumerated(EnumType.STRING)
    private ChatPlatform platform;

    private Long currentViewers;
    private Long peakViewers;
    private LocalDateTime recordedAt;
}
```

### 2. 스케줄러 (10초 주기)
```java
@Scheduled(fixedDelay = 10000)
public void collectAndBroadcast() {
    // 활성 연동에서 시청자 수 조회
    // DB 저장 + WebSocket 브로드캐스트
}
```

### 3. WebSocket 브로드캐스팅
```java
messagingTemplate.convertAndSend(
    "/topic/metrics/" + studioId,
    aggregatedMetrics
);
```

---

## API 테스트 결과

### 서버 실행
```bash
cd media-service && mvn spring-boot:run
# 포트: 8082
```

### 테스트 결과

| API | Status | Response |
|-----|--------|----------|
| `GET /api/media/viewer/1/current` | ✅ 200 | `{"success":true,"data":[]}` |
| `GET /api/media/viewer/1/total` | ✅ 200 | `{"success":true,"data":0}` |
| `GET /api/media/viewer/1/aggregated` | ✅ 200 | 통합 지표 JSON |
| `GET /api/media/viewer/1/platform/YOUTUBE` | ✅ 404 | `{"code":"V001"}` (데이터 없음) |
| `GET /api/media/viewer/1/stats?startTime=...&endTime=...` | ✅ 200 | 빈 통계 JSON |
| `GET /actuator/health` | ✅ 200 | `{"status":"UP"}` |

---

## 커밋 정보

```
커밋: 15854cd
브랜치: be-dev
파일: 13개 변경 (+1,075 lines)
메시지: feat(media): 실시간 시청 지표 모니터링 구현 (S12)
```

---

## TODO (향후 작업)

### 실제 API 연동
1. **YouTube**: YouTube Data API v3 연동
   - `livebroadcasts.list` API로 `concurrentViewers` 조회
   - OAuth 2.0 인증 필요

2. **Twitch**: Twitch Helix API 연동
   - `streams` endpoint로 `viewer_count` 조회
   - Client ID + Access Token 필요

3. **치지직**: 치지직 비공식 API 연동
   - `/service/v2/channels/{channelId}/live-detail` 조회
   - `concurrentUserCount` 필드 사용

### 추가 기능
- 시청자 수 변화 알림 (급증/급감 감지)
- 일간/주간 통계 리포트
- 오래된 데이터 자동 정리 (cleanup)
