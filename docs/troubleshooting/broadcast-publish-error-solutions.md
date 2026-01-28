# 방송 송출 기능 오류 및 해결책 정리

## 개요

| 항목 | 내용 |
|------|------|
| 작성일 | 2025-01-26 |
| 기능 | 방송 송출 (RTMP Streaming) |
| 서비스 | media-service, core-service |
| SDK | LiveKit Server SDK 0.8.1 |

---

## 오류 요약

| # | 오류 | 원인 | 상태 |
|---|------|------|------|
| 1 | stopEgress() 타입 불일치 | SDK API 시그니처 차이 | ✅ |
| 2 | listEgress() 타입 불일치 | SDK API 시그니처 차이 | ✅ |
| 3 | startRoomCompositeEgress() 불일치 | SDK API 시그니처 차이 | ✅ |
| 4 | .get() 메서드 오류 | retrofit2.Call 반환 | ✅ |
| 5 | 401 Unauthorized | 내부 API 인증 필요 | ✅ |
| 6 | Feign 타임아웃 | 설정 누락 | ✅ |
| 7 | Feign 에러 처리 | 디코더 누락 | ✅ |
| 8 | streamKey 누락 | DTO 필드 누락 | ✅ |

---

## 오류 1: stopEgress() 파라미터 타입 불일치

### 오류 메시지
```
'stopEgress(java.lang.String)' cannot be applied to '(LivekitEgress.StopEgressRequest)'
```

### 원인
LiveKit SDK 0.8.1의 `stopEgress()`는 Request 객체가 아닌 **String을 직접** 받음

### 해결
```java
// Before
LivekitEgress.StopEgressRequest stopRequest = LivekitEgress.StopEgressRequest.newBuilder()
        .setEgressId(egressId)
        .build();
egressServiceClient.stopEgress(stopRequest).get();

// After
egressServiceClient.stopEgress(egressId).execute();
```

---

## 오류 2: listEgress() 파라미터 타입 불일치

### 오류 메시지
```
'listEgress(java.lang.String)' cannot be applied to '(LivekitEgress.ListEgressRequest)'
```

### 원인
`listEgress()`도 Request 객체가 아닌 **String roomName**을 받음

### 해결
```java
// Before
LivekitEgress.ListEgressRequest request = LivekitEgress.ListEgressRequest.newBuilder()
        .setEgressId(egressId)
        .build();
List<LivekitEgress.EgressInfo> egressList = egressServiceClient.listEgress(request).get();

// After - null로 전체 조회 후 필터링
retrofit2.Response<List<LivekitEgress.EgressInfo>> response =
        egressServiceClient.listEgress(null).execute();
List<LivekitEgress.EgressInfo> egressList = response.body();

return egressList.stream()
        .filter(info -> info.getEgressId().equals(egressId))
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Egress not found"));
```

---

## 오류 3: startRoomCompositeEgress() 메서드 시그니처 불일치

### 오류 메시지
```
Cannot resolve method 'startRoomCompositeEgress(RoomCompositeEgressRequest)'
```

### 원인
SDK 0.8.1에서는 Request 객체 대신 **개별 파라미터**를 받음
- 시그니처: `startRoomCompositeEgress(String roomName, Output output)`

### 해결
```java
// Before
LivekitEgress.RoomCompositeEgressRequest request = LivekitEgress.RoomCompositeEgressRequest.newBuilder()
        .setRoomName(roomName)
        .setFile(fileOutput)
        .setLayout("speaker")
        .build();
LivekitEgress.EgressInfo egressInfo = egressServiceClient.startRoomCompositeEgress(request).get();

// After
retrofit2.Response<LivekitEgress.EgressInfo> response = egressServiceClient
        .startRoomCompositeEgress(roomName, fileOutput)
        .execute();
LivekitEgress.EgressInfo egressInfo = response.body();
```

---

## 오류 4: .get() 메서드 호출 오류

### 오류 메시지
```
Cannot resolve method 'get' in 'Call'
```

### 원인
SDK가 `CompletableFuture`가 아닌 **retrofit2.Call**을 반환

### 해결
```java
// Before (CompletableFuture 방식)
egressServiceClient.stopEgress(egressId).get();

// After (retrofit2.Call 방식)
egressServiceClient.stopEgress(egressId).execute();
```

---

## 오류 5: 401 Unauthorized (인증 문제)

### 오류 메시지
```
feign.FeignException$Unauthorized: [401] during [POST] to
[http://localhost:8081/api/destinations/internal/batch]
```

### 원인
core-service의 SecurityConfig에서 모든 요청에 인증 요구

### 해결
**core-service/SecurityConfig.java** 수정:
```java
// Before
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**", "/actuator/health").permitAll()
    .anyRequest().authenticated()
)

// After - 내부 API 허용 추가
.authorizeHttpRequests(auth -> auth
    .requestMatchers(
        "/api/auth/**",
        "/api/**/internal/**",  // 추가
        "/actuator/health"
    ).permitAll()
    .anyRequest().authenticated()
)
```

---

## 오류 6: Feign 타임아웃 설정 누락

### 오류 메시지 (잠재적)
```
feign.RetryableException: Read timed out
```

### 원인
Feign 기본 타임아웃이 짧아 네트워크 지연 시 실패

### 해결
**media-service/application.yml** 수정:
```yaml
feign:
  client:
    config:
      default:
        connectTimeout: 5000
        readTimeout: 10000
        loggerLevel: BASIC
    core-service:
      url: ${CORE_SERVICE_URL:http://localhost:8081}
```

---

## 오류 7: Feign 에러 디코더 누락

### 오류 메시지 (잠재적)
```
feign.FeignException: status 500 reading CoreServiceClient#getDestinationsByIds
```

### 원인
적절한 예외 변환 없이 HTTP 상태 코드만 반환

### 해결
**FeignErrorDecoder.java** 신규 생성:
```java
@Slf4j
public class FeignErrorDecoder implements ErrorDecoder {
    @Override
    public Exception decode(String methodKey, Response response) {
        log.error("Feign error: methodKey={}, status={}", methodKey, response.status());

        return switch (response.status()) {
            case 400 -> new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
            case 404 -> new BusinessException(ErrorCode.DESTINATION_NOT_FOUND);
            case 500, 502, 503 -> new BusinessException(ErrorCode.DESTINATION_FETCH_FAILED);
            default -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        };
    }
}
```

**FeignConfig.java** 신규 생성:
```java
@Configuration
public class FeignConfig {
    @Bean
    public ErrorDecoder errorDecoder() {
        return new FeignErrorDecoder();
    }
}
```

---

## 오류 8: DestinationResponse에 streamKey 필드 누락

### 오류 (잠재적)
송출 시 streamKey가 null이 되어 RTMP 연결 실패

### 원인
Entity에는 있지만 DTO 변환 시 필드 누락

### 해결
**core-service/DestinationResponse.java** 수정:
```java
@Getter
@Builder
public class DestinationResponse {
    private Long id;              // 추가
    private String destinationId;
    private String platform;
    private String channelId;
    private String channelName;
    private String rtmpUrl;
    private String streamKey;     // 추가
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static DestinationResponse from(ConnectedDestination entity) {
        return DestinationResponse.builder()
                .id(entity.getId())
                .destinationId(entity.getDestinationId())
                .platform(entity.getPlatform())
                .channelId(entity.getChannelId())
                .channelName(entity.getChannelName())
                .rtmpUrl(entity.getRtmpUrl())
                .streamKey(entity.getStreamKey())  // 추가
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
```

---

## 수정된 파일 목록

### media-service

| 파일 | 변경 |
|------|------|
| `pom.xml` | OpenFeign 의존성 추가 |
| `application.yml` | Feign 설정 추가 |
| `MediaServiceApplication.java` | @EnableFeignClients 추가 |
| `LiveKitEgressService.java` | SDK API 호출 방식 수정 |
| `PublishService.java` | Feign Client 연동 |
| `ErrorCode.java` | 에러 코드 추가 |
| `CoreServiceClient.java` | **신규** |
| `DestinationDto.java` | **신규** |
| `CoreApiResponse.java` | **신규** |
| `FeignErrorDecoder.java` | **신규** |
| `FeignConfig.java` | **신규** |

### core-service

| 파일 | 변경 |
|------|------|
| `SecurityConfig.java` | internal API 허용 |
| `DestinationResponse.java` | id, streamKey 필드 추가 |
| `DestinationService.java` | batch 조회 메서드 추가 |
| `DestinationController.java` | internal API 추가 |
| `ConnectedDestinationRepository.java` | findByIdIn 메서드 추가 |

---

## 핵심 교훈

| 교훈 | 설명 |
|------|------|
| **SDK 버전 확인** | pom.xml에서 버전 확인 후 해당 버전 API 문서 참조 |
| **반환 타입 확인** | CompletableFuture vs retrofit2.Call 구분 |
| **IDE 진단 활용** | 오류 메시지에서 예상 타입과 실제 타입 비교 |
| **내부 API 보안** | 서비스 간 통신용 API는 인증 예외 처리 |
| **DTO 검증** | Entity → DTO 변환 시 필요 필드 모두 포함 |