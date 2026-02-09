# 방송 송출 기능 구현 중 발생한 오류 총정리

## 개요

- **작성일**: 2025-01-26
- **관련 기능**: 방송 송출 (RTMP Streaming)
- **관련 서비스**: media-service, core-service

---

## 오류 목록

| # | 분류 | 오류 | 심각도 | 상태 |
|---|------|------|--------|------|
| 1 | LiveKit SDK | stopEgress() 파라미터 타입 불일치 | 높음 | ✅ 해결 |
| 2 | LiveKit SDK | listEgress() 파라미터 타입 불일치 | 높음 | ✅ 해결 |
| 3 | LiveKit SDK | startRoomCompositeEgress() 메서드 시그니처 불일치 | 높음 | ✅ 해결 |
| 4 | LiveKit SDK | .get() 메서드 호출 오류 | 높음 | ✅ 해결 |
| 5 | Feign | 인증 문제 (401 Unauthorized) | 높음 | ✅ 해결 |
| 6 | Feign | 타임아웃 설정 누락 | 중간 | ✅ 해결 |
| 7 | Feign | 에러 디코더 누락 | 낮음 | ✅ 해결 |
| 8 | DTO | DestinationResponse에 streamKey 필드 누락 | 중간 | ✅ 해결 |

---

## 1. stopEgress() 파라미터 타입 불일치

### 오류 메시지

```
'stopEgress(java.lang.String)' in 'io.livekit.server.EgressServiceClient'
cannot be applied to '(livekit.LivekitEgress.StopEgressRequest)'
```

### 원인

- LiveKit Java SDK 0.8.1의 `stopEgress()` 메서드는 `StopEgressRequest` 객체가 아닌 `String egressId`를 직접 받음
- SDK 버전별로 API 시그니처가 다름

### 원인 파악 방법

- IDE 진단 메시지에서 예상 타입(`String`)과 실제 전달 타입(`StopEgressRequest`) 비교

### 해결

```java
// 변경 전
LivekitEgress.StopEgressRequest stopRequest = LivekitEgress.StopEgressRequest.newBuilder()
        .setEgressId(egressId)
        .build();
egressServiceClient.stopEgress(stopRequest).get();

// 변경 후
egressServiceClient.stopEgress(egressId).execute();
```

### 수정 파일

- `media-service/.../stream/service/LiveKitEgressService.java`

---

## 2. listEgress() 파라미터 타입 불일치

### 오류 메시지

```
'listEgress(java.lang.String)' in 'io.livekit.server.EgressServiceClient'
cannot be applied to '(livekit.LivekitEgress.ListEgressRequest)'
```

### 원인

- `listEgress()` 메서드도 `ListEgressRequest` 객체가 아닌 `String roomName`을 받음
- 특정 egressId로 직접 조회하는 기능이 SDK에서 제공되지 않음

### 해결

```java
// 변경 전
LivekitEgress.ListEgressRequest request = LivekitEgress.ListEgressRequest.newBuilder()
        .setEgressId(egressId)
        .build();
List<LivekitEgress.EgressInfo> egressList = egressServiceClient.listEgress(request).get();

// 변경 후 - null 전달로 전체 조회 후 필터링
retrofit2.Response<List<LivekitEgress.EgressInfo>> response =
        egressServiceClient.listEgress(null).execute();
List<LivekitEgress.EgressInfo> egressList = response.body();

return egressList.stream()
        .filter(info -> info.getEgressId().equals(egressId))
        .findFirst()
        .orElseThrow(() -> new RuntimeException("Egress not found: " + egressId));
```

### 수정 파일

- `media-service/.../stream/service/LiveKitEgressService.java`

---

## 3. startRoomCompositeEgress() 메서드 시그니처 불일치

### 오류 메시지

```
Cannot resolve method 'startRoomCompositeEgress(RoomCompositeEgressRequest)'
```

### 원인

- SDK 0.8.1에서 `startRoomCompositeEgress()`는 `RoomCompositeEgressRequest` 객체 대신 개별 파라미터를 받음
- 메서드 시그니처: `startRoomCompositeEgress(String roomName, Output output)`

### 원인 파악 방법

1. `pom.xml`에서 SDK 버전 확인 (`livekit-server:0.8.1`)
2. 웹 검색으로 해당 버전의 API 문서 확인
3. [LiveKit server-sdk-kotlin GitHub](https://github.com/livekit/server-sdk-kotlin) 참조

### 해결

```java
// 변경 전
LivekitEgress.RoomCompositeEgressRequest request = LivekitEgress.RoomCompositeEgressRequest.newBuilder()
        .setRoomName(roomName)
        .setFile(fileOutput)
        .setLayout("speaker")
        .build();
LivekitEgress.EgressInfo egressInfo = egressServiceClient.startRoomCompositeEgress(request).get();

// 변경 후
retrofit2.Response<LivekitEgress.EgressInfo> response = egressServiceClient
        .startRoomCompositeEgress(roomName, fileOutput)
        .execute();
LivekitEgress.EgressInfo egressInfo = response.body();
```

### 수정 파일

- `media-service/.../stream/service/LiveKitEgressService.java`

---

## 4. .get() 메서드 호출 오류

### 오류 메시지

```
Cannot resolve method 'get' in 'Call'
```

### 원인

- LiveKit SDK 0.8.1은 `CompletableFuture`가 아닌 `retrofit2.Call`을 반환
- `Call` 객체는 `.get()` 메서드가 없음
- `.execute()` (동기) 또는 `.enqueue()` (비동기) 사용 필요

### 해결

```java
// 변경 전 (CompletableFuture 방식)
egressServiceClient.stopEgress(egressId).get();

// 변경 후 (retrofit2.Call 방식)
egressServiceClient.stopEgress(egressId).execute();
```

### 수정 파일

- `media-service/.../stream/service/LiveKitEgressService.java`

---

## 5. 인증 문제 (401 Unauthorized)

### 오류 메시지

```
feign.FeignException$Unauthorized: [401] during [POST] to
[http://localhost:8081/api/destinations/internal/batch]
```

### 원인

- core-service의 SecurityConfig에서 모든 요청에 인증 요구
- media-service에서 인증 토큰 없이 내부 API 호출

```java
// SecurityConfig.java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**", ...).permitAll()
    .anyRequest().authenticated()  // ← 모든 요청 인증 필요
)
```

### 해결

```java
// SecurityConfig.java (수정 후)
.authorizeHttpRequests(auth -> auth
    .requestMatchers(
        "/api/auth/**",
        "/api/**/internal/**",  // ← 내부 API 허용 추가
        "/actuator/health",
        ...
    ).permitAll()
    .anyRequest().authenticated()
)
```

### 수정 파일

- `core-service/.../config/SecurityConfig.java`

---

## 6. Feign 타임아웃 설정 누락

### 오류 메시지 (잠재적)

```
feign.RetryableException: Read timed out executing POST
http://localhost:8081/api/destinations/internal/batch
```

### 원인

- Feign 기본 타임아웃 설정이 짧음
- 네트워크 지연 시 타임아웃 발생 가능

### 해결

```yaml
# application.yml
feign:
  client:
    config:
      default:
        connectTimeout: 5000   # 연결 타임아웃 5초
        readTimeout: 10000     # 읽기 타임아웃 10초
        loggerLevel: BASIC
```

### 수정 파일

- `media-service/src/main/resources/application.yml`

---

## 7. Feign 에러 디코더 누락

### 오류 메시지 (잠재적)

```
feign.FeignException: status 500 reading CoreServiceClient#getDestinationsByIds(List)
```

### 원인

- Feign 기본 에러 디코더는 HTTP 상태 코드만 반환
- 애플리케이션 레벨의 적절한 예외 처리 없음

### 해결

```java
// FeignErrorDecoder.java (신규 생성)
public class FeignErrorDecoder implements ErrorDecoder {
    @Override
    public Exception decode(String methodKey, Response response) {
        return switch (response.status()) {
            case 400 -> new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
            case 404 -> new BusinessException(ErrorCode.DESTINATION_NOT_FOUND);
            case 500, 502, 503 -> new BusinessException(ErrorCode.DESTINATION_FETCH_FAILED);
            default -> new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        };
    }
}

// FeignConfig.java (신규 생성)
@Configuration
public class FeignConfig {
    @Bean
    public ErrorDecoder errorDecoder() {
        return new FeignErrorDecoder();
    }
}
```

### 추가 파일

- `media-service/.../global/client/FeignErrorDecoder.java`
- `media-service/.../global/config/FeignConfig.java`

---

## 8. DestinationResponse에 streamKey 필드 누락

### 오류 (잠재적)

- 송출 시 streamKey가 null이 되어 RTMP 연결 실패

### 원인

- `DestinationResponse` DTO에 `streamKey` 필드가 없음
- Entity에는 있지만 DTO 변환 시 누락

### 해결

```java
// DestinationResponse.java (수정 후)
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
                .id(entity.getId())              // 추가
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

### 수정 파일

- `core-service/.../destination/dto/DestinationResponse.java`

---

## 핵심 교훈

| 항목 | 내용 |
|------|------|
| **SDK 버전 확인** | `pom.xml`에서 정확한 버전 확인 후 API 문서 참조 |
| **반환 타입 주의** | `CompletableFuture` vs `retrofit2.Call` 구분 |
| **IDE 진단 활용** | 오류 메시지에서 예상 타입과 실제 타입 비교 |
| **내부 API 보안** | 서비스 간 통신용 API는 인증 예외 처리 필요 |
| **DTO 필드 누락** | Entity → DTO 변환 시 필요한 필드 모두 포함 확인 |

---

## 수정된 파일 목록

### media-service

| 파일 | 변경 유형 |
|------|----------|
| `LiveKitEgressService.java` | 수정 |
| `PublishService.java` | 수정 |
| `application.yml` | 수정 |
| `ErrorCode.java` | 수정 |
| `MediaServiceApplication.java` | 수정 |
| `pom.xml` | 수정 |
| `CoreServiceClient.java` | 신규 |
| `DestinationDto.java` | 신규 |
| `CoreApiResponse.java` | 신규 |
| `FeignErrorDecoder.java` | 신규 |
| `FeignConfig.java` | 신규 |

### core-service

| 파일 | 변경 유형 |
|------|----------|
| `SecurityConfig.java` | 수정 |
| `DestinationResponse.java` | 수정 |
| `DestinationService.java` | 수정 |
| `DestinationController.java` | 수정 |
| `ConnectedDestinationRepository.java` | 수정 |

---

## 참고 문서

- [LiveKit Server SDK Kotlin GitHub](https://github.com/livekit/server-sdk-kotlin)
- [Spring Cloud OpenFeign 공식 문서](https://docs.spring.io/spring-cloud-openfeign/docs/current/reference/html/)
- [Maven Central - livekit-server 0.8.1](https://central.sonatype.com/artifact/io.livekit/livekit-server/0.8.1)