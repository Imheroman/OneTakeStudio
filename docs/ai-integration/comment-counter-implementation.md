# 분당 댓글 수 집계 기능 구현

> 작성일: 2026-01-31
> 브랜치: be-ai

---

## 1. 구현 목적

### 왜 필요한가?
1. **AI 하이라이트 추출**: 댓글 반응이 많은 구간 = 시청자 관심 피크 → AI가 하이라이트 선정에 활용
2. **라이브러리 그래프**: 영상 상세 페이지에서 시간대별 반응 시각화
3. **저장 효율**: 댓글 원문 저장 X → 분당 카운트만 저장 (용량/개인정보 최소화)

### 데이터 흐름
```
방송 중: 댓글 수신 → 분당 카운트 집계 (메모리)
방송 종료: 집계 데이터 → DB 저장
이후: AI API 전달 / 라이브러리 그래프 조회
```

---

## 2. 구현 항목

### 2.1 CommentStats Entity
- 녹화(Recording)별 분당 댓글 수 저장
- JSON 형태로 카운트 배열 저장

```java
@Entity
public class CommentStats {
    @Id @GeneratedValue
    private Long id;

    private Long recordingId;  // 녹화 ID
    private Long studioId;     // 스튜디오 ID

    @Column(columnDefinition = "JSON")
    private String countsJson;  // [12, 25, 45, 30, ...]

    private Integer durationMinutes;  // 총 방송 시간(분)
    private Integer totalCount;       // 총 댓글 수

    private LocalDateTime createdAt;
}
```

### 2.2 CommentCounterService
- 방송 중 실시간 분당 카운트 집계
- 메모리(ConcurrentHashMap) 기반

```java
@Service
public class CommentCounterService {
    // studioId → 분당 카운트 리스트
    private Map<Long, List<AtomicInteger>> counters = new ConcurrentHashMap<>();

    // 방송 시작 시 초기화
    public void startCounting(Long studioId);

    // 댓글 수신 시 카운트 증가
    public void incrementCount(Long studioId);

    // 방송 종료 시 결과 반환 및 정리
    public List<Integer> stopAndGetCounts(Long studioId);
}
```

### 2.3 저장 로직
- 녹화 종료 시 `CommentStats` 저장
- `RecordingService.stopRecording()` 또는 Webhook에서 호출

### 2.4 조회 API
```
GET /api/library/videos/{videoId}/comment-counts

Response:
{
  "videoId": "abc123",
  "recordingId": 1,
  "durationMinutes": 45,
  "counts": [12, 25, 45, 30, 18, ...],
  "totalCount": 1250
}
```

---

## 3. 기존 코드와의 통합

### ChatService 수정
- `sendMessage()` 또는 `receiveExternalMessage()` 호출 시 카운터 증가

```java
// ChatService.sendMessage() 내부
commentCounterService.incrementCount(request.getStudioId());
```

### StreamService 또는 RecordingService 수정
- 녹화 시작 시: `commentCounterService.startCounting(studioId)`
- 녹화 종료 시: `commentCounterService.stopAndGetCounts(studioId)` → DB 저장

---

## 4. 파일 목록

| 파일 | 설명 |
|------|------|
| `chat/entity/CommentStats.java` | Entity |
| `chat/repository/CommentStatsRepository.java` | Repository |
| `chat/service/CommentCounterService.java` | 분당 카운트 집계 서비스 |
| `chat/dto/CommentCountsResponse.java` | 응답 DTO |
| `chat/controller/CommentStatsController.java` | 조회 API |

---

## 5. 구현 순서

1. [x] 문서 작성
2. [x] CommentStats Entity 생성
3. [x] CommentStatsRepository 생성
4. [x] CommentCounterService 생성
5. [x] ChatService에 카운터 연동
6. [x] 녹화 시작/종료 시 카운터 연동 (RecordingService)
7. [x] CommentCountsResponse DTO
8. [x] 조회 API 컨트롤러 (CommentStatsController)
9. [ ] 테스트

---

## 6. 생성/수정된 파일

### 신규 생성
| 파일 | 설명 |
|------|------|
| `chat/entity/CommentStats.java` | 분당 댓글 수 저장 Entity |
| `chat/repository/CommentStatsRepository.java` | Repository |
| `chat/service/CommentCounterService.java` | 분당 카운트 집계 서비스 |
| `chat/dto/CommentCountsResponse.java` | 응답 DTO |
| `chat/controller/CommentStatsController.java` | 조회 API |

### 수정
| 파일 | 수정 내용 |
|------|-----------|
| `chat/service/ChatService.java` | 메시지 전송 시 카운터 증가 호출 |
| `recording/service/RecordingService.java` | 녹화 시작/완료 시 카운터 시작/저장 |

---

## 7. 각 기능별 구현 이유

### 7.1 CommentStats Entity

#### 왜 JSON으로 카운트를 저장하는가?
```java
@Column(columnDefinition = "JSON")
private String countsJson;  // [12, 25, 45, 30, ...]
```

| 대안 | 장점 | 단점 |
|------|------|------|
| **JSON 배열 (선택)** | 단일 쿼리로 전체 조회, AI API 전달 시 그대로 사용 | JSON 파싱 필요 |
| 별도 테이블 (분당 1행) | 정규화됨, 부분 조회 가능 | JOIN 필요, 쿼리 복잡 |
| Redis | 빠른 조회 | 영속성 관리 필요 |

**결정 이유**:
- 분당 카운트는 항상 전체를 한 번에 조회 (그래프, AI 전달)
- 부분 조회/수정 필요 없음
- MySQL 8.0+ JSON 타입 지원으로 충분한 성능

#### 왜 recordingId와 studioId 둘 다 저장하는가?
- `recordingId`: 특정 녹화의 통계 조회 (라이브러리 상세)
- `studioId`: 스튜디오 기준 최근 통계 조회 (대시보드)
- 두 가지 조회 패턴 모두 지원

---

### 7.2 CommentCounterService

#### 왜 메모리(ConcurrentHashMap)를 사용하는가?
```java
private final Map<Long, CounterInfo> counters = new ConcurrentHashMap<>();
```

| 대안 | 장점 | 단점 |
|------|------|------|
| **메모리 (선택)** | 가장 빠름, 구현 간단 | 서버 재시작 시 손실 |
| Redis | 영속성, 분산 환경 지원 | 네트워크 지연, 복잡도 증가 |
| DB 직접 저장 | 영속성 보장 | 매 댓글마다 DB 쓰기 = 성능 저하 |

**결정 이유**:
- 방송 중 초당 수십~수백 개 댓글 가능 → 빠른 쓰기 필수
- 서버 재시작 시 손실 가능하나:
  - 방송 중 서버 재시작은 드묾
  - 손실되어도 AI 하이라이트 추출에 치명적이지 않음 (STT가 주요 입력)
- 분산 환경 필요 시 Redis로 마이그레이션 가능 (인터페이스 동일)

#### 왜 AtomicInteger를 사용하는가?
```java
private final List<AtomicInteger> counts;
```

- 동시에 여러 플랫폼(유튜브, 치지직)에서 댓글 수신 가능
- `synchronized` 블록 없이 thread-safe한 증가 연산
- Lock-free로 성능 우수

#### 왜 방송 시작 시간 기준으로 분 인덱스를 계산하는가?
```java
public int getCurrentMinuteIndex() {
    long minutes = Duration.between(startTime, LocalDateTime.now()).toMinutes();
    return (int) Math.max(0, minutes);
}
```

- 실제 방송 시작 시점 기준으로 정확한 타임라인 매핑
- 영상 재생 시간과 1:1 대응
- 그래프 X축 = 영상 타임라인

---

### 7.3 ChatService 연동

#### 왜 isCountingActive 체크를 하는가?
```java
if (commentCounterService.isCountingActive(request.getStudioId())) {
    commentCounterService.incrementCount(request.getStudioId());
}
```

- 녹화 중이 아닐 때도 채팅은 가능 (테스트, 대기실 등)
- 녹화 중일 때만 카운트 → 불필요한 메모리 사용 방지
- 카운터가 없는 상태에서 incrementCount 호출 시 자동 시작 방지

---

### 7.4 RecordingService 연동

#### 왜 녹화 시작/완료에 연동하는가?
```java
// startRecording()
commentCounterService.startCounting(request.getStudioId());

// completeRecording()
commentCounterService.saveAndStopCounting(recordingSession.getStudioId(), recordingId);
```

| 시점 | 이유 |
|------|------|
| 녹화 시작 | 영상 타임라인과 댓글 타임라인 동기화 |
| 녹화 완료 | 영상과 댓글 통계를 함께 저장 → AI 전달 가능 |

- stopRecording이 아닌 completeRecording에서 저장:
  - Webhook으로 파일 정보 수신 후 저장
  - 녹화 실패 시 불필요한 저장 방지

---

### 7.5 CommentStatsController

#### 왜 3개의 API를 제공하는가?

| API | 용도 | 사용처 |
|-----|------|--------|
| `GET /recordings/{id}/comment-counts` | 녹화 ID로 조회 | 라이브러리 상세 페이지 |
| `GET /studios/{id}/comment-counts` | 최근 녹화 조회 | 대시보드, 스튜디오 통계 |
| `GET /studios/{id}/comment-counts/live` | 실시간 카운터 | 디버깅, 모니터링 |

- recordingId 기준: 영상 상세 페이지에서 해당 영상의 통계 표시
- studioId 기준: 스튜디오 전체 통계, 가장 최근 방송 통계
- live: 개발 중 테스트, 운영 중 모니터링

---

### 7.6 CommentCountsResponse DTO

#### 왜 Entity를 직접 반환하지 않는가?
```java
public static CommentCountsResponse from(CommentStats stats) {
    List<Integer> counts = parseCountsJson(stats.getCountsJson());
    // ...
}
```

- JSON 문자열 → List<Integer> 변환 필요
- 프론트엔드에서 바로 사용 가능한 형태로 제공
- Entity 내부 구조 변경 시 API 응답 영향 최소화
