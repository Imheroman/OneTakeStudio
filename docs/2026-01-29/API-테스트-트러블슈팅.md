# API 테스트 트러블슈팅 (2025-01-29)

## 개요

전체 API 테스트 수행 중 발견된 이슈와 해결 방안을 정리합니다.

---

## 1. 스튜디오 수정 API 오류

### 증상
```bash
PUT /api/studios/7
→ {"resultCode":"FAILURE","success":false,"message":"서버 오류가 발생했습니다."}
```

### 원인
- **HTTP 메서드 불일치**: API가 `@PatchMapping`으로 구현되어 있으나 `PUT`으로 호출
- StudioController.java:58 에서 `@PatchMapping("/{studioId}")` 사용

### 해결
```bash
# 올바른 호출 방법
PATCH /api/studios/7
→ {"resultCode":"SUCCESS","success":true,"message":"스튜디오 수정 성공",...}
```

### 대안 검토

| 방안 | 설명 | 선택 여부 |
|------|------|----------|
| PUT + PATCH 둘 다 지원 | 두 메서드 모두 같은 로직 수행 | X |
| PATCH만 유지 (현재 상태) | 부분 수정 의미로 PATCH 사용 | **O (선택)** |
| PUT으로 변경 | PATCH를 PUT으로 변경 | X |

### 선택 이유
- `UpdateStudioRequest`가 `name`, `thumbnail`만 받는 부분 수정 DTO
- RESTful 원칙상 부분 수정은 `PATCH`가 적합
- 기존 프론트엔드 코드와의 호환성 유지

---

## 2. 워크스페이스 API 오류

### 증상
```bash
GET /api/workspace
→ {"resultCode":"FAILURE","success":false,"message":"서버 오류가 발생했습니다."}
```

### 원인
- **엔드포인트 경로 오류**: 실제 엔드포인트는 `/api/workspace/dashboard`
- WorkspaceController.java에 정의된 엔드포인트:
  - `GET /api/workspace/dashboard` - 대시보드 조회
  - `GET /api/workspace/{userId}/studios/recent` - 최근 스튜디오 목록

### 해결
```bash
# 올바른 호출 방법
GET /api/workspace/dashboard
→ {"resultCode":"SUCCESS","success":true,"message":"대시보드 조회 성공",...}
```

### 결론
- API 자체는 정상 동작
- 테스트 시 올바른 엔드포인트 사용 필요

---

## 3. Gateway → Media Service 라우팅 이슈

### 증상
```bash
# Gateway 통해 Media Service 호출
POST http://localhost:60000/api/v1/media/stream/join
→ {"status":500,"code":"C001","message":"서버 내부 오류가 발생했습니다"}
```

### 원인 분석

#### 초기 가설
1. X-User-Id 헤더 전달 실패?
2. Gateway 라우팅 설정 오류?
3. JWT 필터 동작 문제?

#### 실제 원인
- **DB Unique Constraint 위반**: `room_name` 컬럼에 unique 제약조건
- 이전에 직접 Media Service 호출 시 이미 세션 생성됨
- 같은 `studioId`로 재호출 시 중복 키 에러 발생

```
PSQLException: ERROR: duplicate key value violates unique constraint
Detail: Key (room_name)=(studio-7) already exists.
```

### 검증
```bash
# 기존 세션이 없는 studioId로 테스트
POST /api/v1/media/stream/join {"studioId":4,...}
→ {"success":true,"data":{"token":"...","roomName":"studio-4",...}}

# 로그 확인
Stream session created: studioId=4, userId=8, roomName=studio-4
```

### 결론
- **Gateway 라우팅**: 정상 동작
- **X-User-Id 헤더 전달**: 정상 동작 (userId=8 확인)
- **실제 문제**: StreamService에서 기존 세션 처리 로직 부재

### 개선 방안 검토

| 방안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| 기존 세션 재사용 | ACTIVE 세션 있으면 토큰만 재발급 | 자연스러운 재참여 | 세션 상태 관리 복잡 |
| 기존 세션 종료 후 생성 | 기존 세션 CLOSED 처리 후 신규 생성 | 구현 단순 | 데이터 정합성 이슈 |
| 참가자별 세션 분리 | room_name + user_id로 unique 변경 | 다중 참가자 지원 | 스키마 변경 필요 |
| room_name unique 제거 | unique 제약조건 제거 | 가장 단순 | 데이터 중복 가능 |

### 권장 방안: 기존 세션 재사용

```java
@Transactional
public StreamTokenResponse joinStream(Long userId, StreamTokenRequest request) {
    String roomName = "studio-" + request.getStudioId();

    // 1. 해당 사용자의 기존 활성 세션 확인
    Optional<StreamSession> existingSession = streamSessionRepository
            .findByStudioIdAndUserIdAndStatusIn(
                request.getStudioId(),
                userId,
                List.of(SessionStatus.ACTIVE, SessionStatus.CONNECTING)
            );

    if (existingSession.isPresent()) {
        // 2. 기존 세션이 있으면 토큰만 재발급
        log.info("Reusing existing session for user {} in studio {}", userId, request.getStudioId());
        return liveKitService.generateToken(userId, request);
    }

    // 3. 새 세션 생성
    StreamTokenResponse tokenResponse = liveKitService.generateToken(userId, request);

    StreamSession session = StreamSession.builder()
            .studioId(request.getStudioId())
            .userId(userId)
            .roomName(roomName)
            .participantIdentity(tokenResponse.getParticipantIdentity())
            .status(SessionStatus.CONNECTING)
            .build();

    streamSessionRepository.save(session);
    return tokenResponse;
}
```

---

## API 테스트 결과 요약

### Core Service (port 8080)

| API | Method | Endpoint | 결과 |
|-----|--------|----------|------|
| 이메일 중복 확인 | GET | `/api/auth/check-email` | ✅ |
| 로그인 | POST | `/api/auth/login` | ✅ |
| 토큰 갱신 | POST | `/api/auth/refresh` | ✅ |
| 로그아웃 | POST | `/api/auth/logout` | ✅ |
| 내 정보 조회 | GET | `/api/users/me` | ✅ |
| 프로필 수정 | PUT | `/api/users/me` | ✅ |
| 스튜디오 목록 | GET | `/api/studios` | ✅ |
| 스튜디오 생성 | POST | `/api/studios` | ✅ |
| 스튜디오 상세 | GET | `/api/studios/{id}` | ✅ |
| 스튜디오 수정 | **PATCH** | `/api/studios/{id}` | ✅ |
| 스튜디오 멤버 | GET | `/api/studios/{id}/members` | ✅ |
| Scene 생성 | POST | `/api/studios/{id}/scenes` | ✅ |
| Scene 목록 | GET | `/api/studios/{id}/scenes` | ✅ |
| 목적지 목록 | GET | `/api/destinations` | ✅ |
| 목적지 생성 | POST | `/api/destinations` | ✅ |
| 대시보드 | GET | `/api/workspace/dashboard` | ✅ |

### Media Service (port 8082)

| API | Method | Endpoint | 결과 |
|-----|--------|----------|------|
| 스트림 참가 | POST | `/api/v1/media/stream/join` | ✅ |
| ICE Servers | GET | `/api/v1/media/ice-servers` | ✅ |
| 녹화 목록 | GET | `/api/v1/media/record/studio/{id}` | ✅ |
| 송출 상태 | GET | `/api/v1/media/publish/status` | ✅ |

### 토큰 블랙리스트

| 테스트 | 결과 |
|--------|------|
| 로그아웃된 토큰으로 API 호출 | ✅ 정상 차단 (401) |
| 새 토큰으로 API 호출 | ✅ 정상 동작 |

---

## 교훈 및 권장사항

1. **HTTP 메서드 명확히 문서화**: PUT vs PATCH 구분 필요
2. **API 명세서 최신화**: 실제 엔드포인트와 문서 일치 확인
3. **멱등성 고려**: 같은 요청 반복 시에도 오류 없이 처리되도록 설계
4. **에러 메시지 구체화**: "서버 오류" 대신 구체적인 원인 표시

---

## 테스트 환경

- **날짜**: 2025-01-29
- **서비스 버전**: Spring Boot 3.5.9, Java 21
- **테스트 계정**: unimokw1@gmail.com
- **포트**: Eureka(8761), Gateway(60000), Core(8080), Media(8082)
