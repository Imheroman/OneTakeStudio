# Media Service 완성 코드

## 1. 토큰 발급 API (복붙 가능)

### StreamController.java
```java
package com.onetakestudio.media.stream.controller;

import com.onetakestudio.media.global.common.ApiResponse;
import com.onetakestudio.media.global.security.UserPrincipal;
import com.onetakestudio.media.stream.dto.TokenRequest;
import com.onetakestudio.media.stream.dto.TokenResponse;
import com.onetakestudio.media.stream.service.StreamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/media")
@RequiredArgsConstructor
public class StreamController {

    private final StreamService streamService;

    /**
     * WebRTC 토큰 발급
     * 
     * 언제 호출?
     * - 사용자가 스튜디오에 입장할 때
     * - 프론트에서 이 토큰으로 LiveKit 서버에 연결
     */
    @PostMapping("/token")
    public ResponseEntity<ApiResponse<TokenResponse>> createToken(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody @Valid TokenRequest request) {
        
        TokenResponse response = streamService.createToken(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * ICE 서버 목록 조회
     * 
     * 언제 호출?
     * - WebRTC 연결 전 TURN/STUN 서버 정보 필요할 때
     */
    @GetMapping("/ice-servers")
    public ResponseEntity<ApiResponse<IceServersResponse>> getIceServers() {
        IceServersResponse response = streamService.getIceServers();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

### StreamService.java
```java
package com.onetakestudio.media.stream.service;

import com.onetakestudio.media.global.exception.BusinessException;
import com.onetakestudio.media.global.exception.ErrorCode;
import com.onetakestudio.media.stream.dto.TokenRequest;
import com.onetakestudio.media.stream.dto.TokenResponse;
import com.onetakestudio.media.stream.entity.SessionRole;
import com.onetakestudio.media.stream.entity.StreamSession;
import com.onetakestudio.media.stream.repository.StreamSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StreamService {

    private final StreamSessionRepository streamSessionRepository;
    private final LiveKitService liveKitService;

    /**
     * WebRTC 토큰 발급
     * 
     * 처리 순서:
     * 1. 스튜디오 멤버인지 확인 (Core Service 호출)
     * 2. 역할에 따른 권한 결정
     * 3. LiveKit 토큰 생성
     * 4. 세션 정보 DB 저장
     */
    @Transactional
    public TokenResponse createToken(Long userId, TokenRequest request) {
        log.info("토큰 발급 요청: userId={}, studioId={}, role={}", 
                 userId, request.getStudioId(), request.getRole());

        // 1. 멤버 권한 확인
        // TODO: Core Service 호출해서 실제 멤버인지 확인
        // 지금은 임시로 통과
        validateMembership(userId, request.getStudioId());

        // 2. 역할 결정
        SessionRole role = SessionRole.valueOf(request.getRole().toUpperCase());
        boolean canPublish = (role == SessionRole.HOST || role == SessionRole.GUEST);

        // 3. LiveKit 토큰 생성
        String roomName = request.getStudioId().toString();
        String participantName = userId.toString();
        String token = liveKitService.createToken(roomName, participantName, canPublish);
        String serverUrl = liveKitService.getServerUrl();

        // 4. 세션 정보 저장
        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(6);
        StreamSession session = StreamSession.builder()
                .studioId(request.getStudioId())
                .userId(userId)
                .role(role)
                .token(token)
                .serverUrl(serverUrl)
                .expiresAt(expiresAt)
                .build();
        streamSessionRepository.save(session);

        log.info("토큰 발급 완료: sessionId={}", session.getId());

        return TokenResponse.builder()
                .token(token)
                .serverUrl(serverUrl)
                .expiresAt(expiresAt)
                .build();
    }

    private void validateMembership(Long userId, Long studioId) {
        // TODO: Core Service의 Member API 호출
        // RestTemplate 또는 WebClient로 GET /studios/{studioId}/members/{userId}
        // 응답이 403이면 BusinessException 던짐
        
        // 임시: 항상 통과
        log.debug("멤버 권한 확인 (임시 통과): userId={}, studioId={}", userId, studioId);
    }

    /**
     * ICE 서버 목록 조회
     * 
     * 프론트에서 TURN/STUN 설정에 사용
     */
    public IceServersResponse getIceServers() {
        return IceServersResponse.builder()
                .iceServers(List.of())
                .build();
    }
}
```

### DTO
```java
// TokenRequest.java
@Getter
@NoArgsConstructor
public class TokenRequest {
    
    @NotNull(message = "스튜디오 ID는 필수입니다")
    private Long studioId;
    
    @NotBlank(message = "역할은 필수입니다")
    @Pattern(regexp = "^(host|guest|viewer)$", message = "역할은 host, guest, viewer 중 하나여야 합니다")
    private String role;
}

// TokenResponse.java
@Getter
@Builder
public class TokenResponse {
    private String token;
    private String serverUrl;
    private OffsetDateTime expiresAt;
}

// IceServersResponse.java
@Getter
@Builder
public class IceServersResponse {
    private List<IceServer> iceServers;

    @Getter
    @Builder
    public static class IceServer {
        private List<String> urls;
        private String username;
        private String credential;
    }
}
```

---

## 2. 녹화 API (복붙 가능)

### RecordingController.java
```java
package com.onetakestudio.media.recording.controller;

import com.onetakestudio.media.global.common.ApiResponse;
import com.onetakestudio.media.global.security.UserPrincipal;
import com.onetakestudio.media.recording.dto.*;
import com.onetakestudio.media.recording.service.RecordingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/media/record")
@RequiredArgsConstructor
public class RecordingController {

    private final RecordingService recordingService;

    /**
     * 녹화 시작
     * 
     * 언제 호출?
     * - 사용자가 "녹화 시작" 버튼 클릭
     * - 저장 공간 확인 후 LiveKit Egress 시작
     */
    @PostMapping("/start")
    public ResponseEntity<ApiResponse<RecordingStartResponse>> startRecording(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody @Valid RecordingStartRequest request) {
        
        RecordingStartResponse response = recordingService.startRecording(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 녹화 일시정지
     */
    @PostMapping("/pause")
    public ResponseEntity<ApiResponse<Void>> pauseRecording(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody @Valid RecordingControlRequest request) {
        
        recordingService.pauseRecording(user.getUserId(), request.getRecordingId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 녹화 재개
     */
    @PostMapping("/resume")
    public ResponseEntity<ApiResponse<Void>> resumeRecording(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody @Valid RecordingControlRequest request) {
        
        recordingService.resumeRecording(user.getUserId(), request.getRecordingId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    /**
     * 녹화 중지
     * 
     * 언제 호출?
     * - 사용자가 "녹화 중지" 버튼 클릭
     * - Egress 중지 → 파일 저장 → S3 업로드
     */
    @PostMapping("/stop")
    public ResponseEntity<ApiResponse<RecordingStopResponse>> stopRecording(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody @Valid RecordingControlRequest request) {
        
        RecordingStopResponse response = recordingService.stopRecording(user.getUserId(), request.getRecordingId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 녹화 상태 조회
     */
    @GetMapping("/{recordingId}")
    public ResponseEntity<ApiResponse<RecordingStatusResponse>> getRecordingStatus(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID recordingId) {
        
        RecordingStatusResponse response = recordingService.getRecordingStatus(user.getUserId(), recordingId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

### RecordingService.java
```java
package com.onetakestudio.media.recording.service;

import com.onetakestudio.media.global.exception.BusinessException;
import com.onetakestudio.media.global.exception.ErrorCode;
import com.onetakestudio.media.recording.dto.*;
import com.onetakestudio.media.recording.entity.Recording;
import com.onetakestudio.media.recording.entity.RecordingQuality;
import com.onetakestudio.media.recording.entity.RecordingStatus;
import com.onetakestudio.media.recording.entity.StorageType;
import com.onetakestudio.media.recording.repository.RecordingRepository;
import com.onetakestudio.media.stream.service.LiveKitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecordingService {

    private final RecordingRepository recordingRepository;
    private final LiveKitService liveKitService;
    private final StorageService storageService;  // S3 업로드용

    /**
     * 녹화 시작
     * 
     * 처리 순서:
     * 1. 이미 녹화 중인지 확인
     * 2. 저장 공간 확인 (User Service 호출)
     * 3. Recording 엔티티 생성
     * 4. LiveKit Egress 시작
     * 5. 상태 업데이트
     */
    @Transactional
    public RecordingStartResponse startRecording(Long userId, RecordingStartRequest request) {
        log.info("녹화 시작 요청: userId={}, studioId={}", userId, request.getStudioId());

        // 1. 이미 녹화 중인지 확인
        boolean alreadyRecording = recordingRepository.existsActiveByStudioId(request.getStudioId());
        if (alreadyRecording) {
            throw new BusinessException(ErrorCode.RECORDING_IN_PROGRESS);
        }

        // 2. 저장 공간 확인
        // TODO: Core Service의 User API 호출해서 quota 확인
        // 부족하면 BusinessException(ErrorCode.STORAGE_EXCEEDED)
        validateStorageQuota(userId);

        // 3. Recording 엔티티 생성
        Recording recording = Recording.builder()
                .studioId(request.getStudioId())
                .createdBy(userId)
                .title(request.getTitle())
                .quality(RecordingQuality.fromApi(request.getQuality()))
                .storage(StorageType.valueOf(request.getStorage().toUpperCase()))
                .build();
        recordingRepository.save(recording);

        // 4. LiveKit Egress 시작
        String roomName = request.getStudioId().toString();
        String outputPath = generateOutputPath(recording.getRecordingKey());
        
        try {
            String egressId = liveKitService.startRecording(roomName, outputPath);
            
            // 5. 상태 업데이트
            recording.start(egressId);
            
            log.info("녹화 시작 완료: recordingKey={}, egressId={}", recording.getRecordingKey(), egressId);
            
        } catch (Exception e) {
            log.error("녹화 시작 실패: {}", e.getMessage());
            recording.fail();
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR);
        }

        return RecordingStartResponse.builder()
                .recordingId(recording.getRecordingKey())
                .status(recording.getStatus().name())
                .build();
    }

    /**
     * 녹화 중지
     * 
     * 처리 순서:
     * 1. Recording 조회
     * 2. LiveKit Egress 중지
     * 3. 상태 → PROCESSING
     * 4. (비동기) 파일 처리 및 S3 업로드
     */
    @Transactional
    public RecordingStopResponse stopRecording(Long userId, UUID recordingId) {
        log.info("녹화 중지 요청: userId={}, recordingId={}", userId, recordingId);

        // 1. Recording 조회
        Recording recording = recordingRepository.findByRecordingKey(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));

        // 권한 확인
        if (!recording.getCreatedBy().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 녹화 중인지 확인
        if (!recording.isActive()) {
            throw new BusinessException(ErrorCode.RECORDING_NOT_IN_PROGRESS);
        }

        // 2. LiveKit Egress 중지
        try {
            liveKitService.stopRecording(recording.getEgressId());
        } catch (Exception e) {
            log.error("Egress 중지 실패: {}", e.getMessage());
            // 실패해도 일단 처리 계속 (나중에 정리)
        }

        // 3. 상태 변경
        recording.stop();

        // 4. 비동기로 파일 처리 (실제로는 @Async 또는 이벤트로 처리)
        // uploadAndComplete(recording.getRecordingKey(), localPath, thumbnailUrl, durationMs);

        log.info("녹화 중지 완료: recordingId={}", recordingId);

        return RecordingStopResponse.builder()
                .recordingId(recording.getRecordingKey())
                .status(recording.getStatus().name())
                .message("녹화가 중지되었습니다. 파일 처리 중...")
                .build();
    }

    /**
     * 녹화 일시정지
     */
    @Transactional
    public void pauseRecording(Long userId, UUID recordingId) {
        Recording recording = recordingRepository.findByRecordingKey(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));
        if (!recording.getCreatedBy().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        recording.pause();
    }

    /**
     * 녹화 재개
     */
    @Transactional
    public void resumeRecording(Long userId, UUID recordingId) {
        Recording recording = recordingRepository.findByRecordingKey(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));
        if (!recording.getCreatedBy().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        recording.resume();
    }

    /**
     * 녹화 상태 조회
     */
    public RecordingStatusResponse getRecordingStatus(Long userId, UUID recordingId) {
        Recording recording = recordingRepository.findByRecordingKey(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));
        if (!recording.getCreatedBy().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        return RecordingStatusResponse.builder()
                .recordingId(recording.getRecordingKey())
                .status(recording.getStatus().name())
                .fileUrl(recording.getFileUrl())
                .fileSize(recording.getFileSize())
                .durationMs(recording.getDurationMs())
                .startedAt(recording.getStartedAt())
                .endedAt(recording.getEndedAt())
                .build();
    }

    /**
     * 녹화 완료 처리 (Webhook 또는 비동기에서 호출)
     */
    @Transactional
    public void completeRecording(UUID recordingId, String url, String thumbnailUrl, 
                                   Long durationMs, Long fileSize) {
        Recording recording = recordingRepository.findByRecordingKey(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));

        recording.complete(url, fileSize, thumbnailUrl, durationMs);
        
        log.info("녹화 완료 처리: recordingId={}, url={}", recordingId, url);

        // TODO: Core Service에 알림 (Library에 추가)
        // TODO: Notification Service에 알림 (사용자에게 푸시)
    }

    /**
     * LiveKit Webhook/비동기 작업에서 호출: 로컬 파일을 S3에 업로드 후 완료 처리
     */
    @Transactional
    public void uploadAndComplete(UUID recordingId, String localPath, String thumbnailUrl, Long durationMs) {
        Recording recording = recordingRepository.findByRecordingKey(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RECORDING_NOT_FOUND));

        StorageUploadResult upload = storageService.upload(localPath, buildStorageKey(recording));
        recording.complete(upload.getUrl(), upload.getSize(), thumbnailUrl, durationMs);
    }

    private String buildStorageKey(Recording recording) {
        String date = recording.getStartedAt() != null
                ? recording.getStartedAt().toLocalDate().toString()
                : java.time.LocalDate.now().toString();
        return String.format("recordings/%s/%s.mp4", date, recording.getRecordingKey());
    }

    private void validateStorageQuota(Long userId) {
        // TODO: Core Service 호출
        log.debug("저장 공간 확인 (임시 통과): userId={}", userId);
    }

    private String generateOutputPath(UUID recordingId) {
        return String.format("/recordings/%s/%s.mp4", 
                java.time.LocalDate.now(), recordingId);
    }
}
```

### DTO
```java
// RecordingStartRequest.java
@Getter
@NoArgsConstructor
public class RecordingStartRequest {
    
    @NotNull(message = "스튜디오 ID는 필수입니다")
    private Long studioId;
    
    private String title;
    
    @NotBlank(message = "화질은 필수입니다")
    @Pattern(regexp = "^(720p|1080p|4k)$")
    private String quality;
    
    @NotBlank(message = "저장 위치는 필수입니다")
    @Pattern(regexp = "^(local|cloud)$")
    private String storage;
}

// RecordingStartResponse.java
@Getter
@Builder
public class RecordingStartResponse {
    private UUID recordingId;
    private String status;
}

// RecordingControlRequest.java
@Getter
@NoArgsConstructor
public class RecordingControlRequest {
    
    @NotNull(message = "녹화 ID는 필수입니다")
    private UUID recordingId;
}

// RecordingStopResponse.java
@Getter
@Builder
public class RecordingStopResponse {
    private UUID recordingId;
    private String status;
    private String message;
    private String url;          // 완료 시
    private Long durationMs;     // 완료 시
    private Long fileSize;       // 완료 시
}

// RecordingStatusResponse.java
@Getter
@Builder
public class RecordingStatusResponse {
    private UUID recordingId;
    private String status;
    private String fileUrl;
    private Long fileSize;
    private Long durationMs;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
}
```

---

## Storage (S3 업로드)

### StorageService.java
```java
package com.onetakestudio.media.recording.service;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StorageUploadResult {
    private String url;
    private Long size;
}

public interface StorageService {
    StorageUploadResult upload(String localPath, String key);
}
```

### S3StorageService.java
```java
package com.onetakestudio.media.recording.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.file.Files;
import java.nio.file.Path;

@Service
@RequiredArgsConstructor
public class S3StorageService implements StorageService {

    private final S3Client s3Client;

    @Value("${storage.s3.bucket}")
    private String bucket;

    @Override
    public StorageUploadResult upload(String localPath, String key) {
        try {
            Path path = Path.of(localPath);
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType("video/mp4")
                    .build();

            s3Client.putObject(request, RequestBody.fromFile(path));

            return StorageUploadResult.builder()
                    .url(buildUrl(key))
                    .size(Files.size(path))
                    .build();
        } catch (Exception e) {
            throw new IllegalStateException("S3 업로드 실패", e);
        }
    }

    private String buildUrl(String key) {
        return String.format("https://%s.s3.amazonaws.com/%s", bucket, key);
    }
}
```

### S3Config.java
```java
package com.onetakestudio.media.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class S3Config {

    @Bean
    public S3Client s3Client(@Value("${storage.s3.region}") String region) {
        return S3Client.builder()
                .region(Region.of(region))
                .build();
    }
}
```

> 인증은 기본 AWS Credential Provider Chain 사용 (환경변수/프로파일/IAM Role).

---

## 3. 송출 API (복붙 가능)

### PublishController.java
```java
package com.onetakestudio.media.publish.controller;

import com.onetakestudio.media.global.common.ApiResponse;
import com.onetakestudio.media.global.security.UserPrincipal;
import com.onetakestudio.media.publish.dto.*;
import com.onetakestudio.media.publish.service.PublishService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/media/publish")
@RequiredArgsConstructor
public class PublishController {

    private final PublishService publishService;

    /**
     * RTMP 송출 시작
     * 
     * 언제 호출?
     * - 사용자가 "Go Live" 버튼 클릭
     * - YouTube, Twitch 등으로 동시 송출
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PublishStartResponse>> startPublish(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody @Valid PublishStartRequest request) {
        
        PublishStartResponse response = publishService.startPublish(user.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * RTMP 송출 중지
     */
    @PostMapping("/stop")
    public ResponseEntity<ApiResponse<PublishStopResponse>> stopPublish(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody @Valid PublishStopRequest request) {
        
        PublishStopResponse response = publishService.stopPublish(user.getUserId(), request.getPublishId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * 송출 상태 조회
     */
    @GetMapping("/{publishId}")
    public ResponseEntity<ApiResponse<PublishStatusResponse>> getPublishStatus(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID publishId) {
        
        PublishStatusResponse response = publishService.getPublishStatus(user.getUserId(), publishId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
```

### PublishService.java
```java
package com.onetakestudio.media.publish.service;

import com.onetakestudio.media.global.exception.BusinessException;
import com.onetakestudio.media.global.exception.ErrorCode;
import com.onetakestudio.media.publish.dto.*;
import com.onetakestudio.media.destination.entity.ConnectionStatus;
import com.onetakestudio.media.destination.entity.DestinationConnection;
import com.onetakestudio.media.destination.repository.DestinationConnectionRepository;
import com.onetakestudio.media.publish.entity.*;
import com.onetakestudio.media.publish.repository.PublishSessionRepository;
import com.onetakestudio.media.stream.service.LiveKitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublishService {

    private final PublishSessionRepository publishSessionRepository;
    private final DestinationConnectionRepository destinationConnectionRepository;
    private final LiveKitService liveKitService;
    private final DestinationClient destinationClient;  // Core Service 연동

    /**
     * RTMP 송출 시작
     * 
     * 처리 순서:
     * 1. Destination 정보 조회 (Core Service)
     * 2. PublishSession 생성
     * 3. 각 플랫폼으로 Egress 시작
     */
    @Transactional
    public PublishStartResponse startPublish(Long userId, PublishStartRequest request) {
        log.info("송출 시작 요청: userId={}, studioId={}, destinations={}", 
                 userId, request.getStudioId(), request.getDestinationIds());

        // 1. DestinationConnection 조회 (사용자 소유 + 활성)
        List<DestinationConnection> connections =
                destinationConnectionRepository.findByUserIdAndIdInAndStatusAndDeletedAtIsNull(
                        userId, request.getDestinationIds(), ConnectionStatus.ACTIVE);
        if (connections.isEmpty()) {
            throw new BusinessException(ErrorCode.NO_DESTINATIONS);
        }

        // 2. PublishSession 생성
        PublishSession session = PublishSession.builder()
                .studioId(request.getStudioId())
                .startedBy(userId)
                .build();

        // 3. 각 Destination 정보 조회 및 PublishSessionDestination 추가
        List<String> rtmpUrls = new ArrayList<>();
        for (DestinationConnection connection : connections) {
            // Core Service에서 RTMP 정보 조회 (필요 시)
            DestinationInfo info = destinationClient.getDestination(connection.getId());

            PublishSessionDestination destination = PublishSessionDestination.builder()
                    .destination(connection)
                    .streamUrl(info.getRtmpUrl())
                    .streamKeyEnc(encryptStreamKey(info.getStreamKey()))
                    .build();

            session.addDestination(destination);
            rtmpUrls.add(info.getRtmpUrl() + "/" + info.getStreamKey());
        }

        publishSessionRepository.save(session);

        // 4. LiveKit Egress로 RTMP 송출 시작
        String roomName = request.getStudioId().toString();
        try {
            String egressId = liveKitService.startRtmpPublish(roomName, rtmpUrls);
            
            session.start(egressId);
            session.goLive();
            session.getDestinations().forEach(PublishSessionDestination::connect);
            
            log.info("송출 시작 완료: publishKey={}", session.getSessionKey());
            
        } catch (Exception e) {
            log.error("송출 시작 실패: {}", e.getMessage());
            session.fail();
            throw new BusinessException(ErrorCode.LIVEKIT_ERROR);
        }

        return PublishStartResponse.builder()
                .publishId(session.getSessionKey())
                .status(session.getStatus().name())
                .destinations(session.getDestinations().stream()
                        .map(d -> DestinationStatusDto.builder()
                                .platform(d.getDestination().getPlatform().name())
                                .channelName(d.getDestination().getDisplayName())
                                .status(d.getStatus().name())
                                .build())
                        .toList())
                .build();
    }

    /**
     * 송출 중지
     */
    @Transactional
    public PublishStopResponse stopPublish(Long userId, UUID publishId) {
        log.info("송출 중지 요청: userId={}, publishId={}", userId, publishId);

        PublishSession session = publishSessionRepository.findBySessionKey(publishId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PUBLISH_NOT_FOUND));

        if (!session.getStartedBy().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // LiveKit Egress 중지
        try {
            liveKitService.stopRtmpPublish(session.getEgressId());
        } catch (Exception e) {
            log.error("Egress 중지 실패: {}", e.getMessage());
        }

        session.stop();
        session.getDestinations().forEach(PublishSessionDestination::disconnect);
        session.end();

        log.info("송출 중지 완료: publishKey={}", publishId);

        return PublishStopResponse.builder()
                .publishId(session.getSessionKey())
                .status(session.getStatus().name())
                .endedAt(session.getEndedAt())
                .build();
    }

    /**
     * 송출 상태 조회
     */
    public PublishStatusResponse getPublishStatus(Long userId, UUID publishId) {
        PublishSession session = publishSessionRepository.findBySessionKey(publishId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PUBLISH_NOT_FOUND));
        if (!session.getStartedBy().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        return PublishStatusResponse.builder()
                .publishId(session.getSessionKey())
                .status(session.getStatus().name())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .destinations(session.getDestinations().stream()
                        .map(d -> DestinationStatusDto.builder()
                                .platform(d.getDestination().getPlatform().name())
                                .channelName(d.getDestination().getDisplayName())
                                .status(d.getStatus().name())
                                .build())
                        .toList())
                .build();
    }

    private byte[] encryptStreamKey(String streamKey) {
        // TODO: KMS/암호화 적용. 임시로 바이트 변환
        return streamKey.getBytes(StandardCharsets.UTF_8);
    }
}
```

---

### Publish DTO & Client
```java
// PublishStartRequest.java
@Getter
@NoArgsConstructor
public class PublishStartRequest {
    
    @NotNull(message = "스튜디오 ID는 필수입니다")
    private Long studioId;
    
    @NotEmpty(message = "송출 대상은 필수입니다")
    private List<Long> destinationIds;
}

// PublishStopRequest.java
@Getter
@NoArgsConstructor
public class PublishStopRequest {
    
    @NotNull(message = "송출 ID는 필수입니다")
    private UUID publishId;
}

// PublishStartResponse.java
@Getter
@Builder
public class PublishStartResponse {
    private UUID publishId;
    private String status;
    private List<DestinationStatusDto> destinations;
}

// PublishStopResponse.java
@Getter
@Builder
public class PublishStopResponse {
    private UUID publishId;
    private String status;
    private OffsetDateTime endedAt;
}

// PublishStatusResponse.java
@Getter
@Builder
public class PublishStatusResponse {
    private UUID publishId;
    private String status;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;
    private List<DestinationStatusDto> destinations;
}

// DestinationStatusDto.java
@Getter
@Builder
public class DestinationStatusDto {
    private String platform;
    private String channelName;
    private String status;
}

// DestinationClient.java
public interface DestinationClient {
    DestinationInfo getDestination(Long destinationConnectionId);
}

// DestinationInfo.java
@Getter
@Builder
public class DestinationInfo {
    private String platform;
    private String channelName;
    private String rtmpUrl;
    private String streamKey;
}
```

---

## 4. 예외 처리

### ErrorCode.java
```java
package com.onetakestudio.media.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    
    // 공통
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "C001", "잘못된 입력입니다"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "C002", "권한이 없습니다"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C003", "서버 오류가 발생했습니다"),
    
    // 인증
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "A001", "인증이 필요합니다"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "A002", "유효하지 않은 토큰입니다"),
    
    // 스트림
    NOT_STUDIO_MEMBER(HttpStatus.FORBIDDEN, "S001", "스튜디오 멤버가 아닙니다"),
    
    // 녹화
    RECORDING_NOT_FOUND(HttpStatus.NOT_FOUND, "R001", "녹화를 찾을 수 없습니다"),
    RECORDING_IN_PROGRESS(HttpStatus.CONFLICT, "R002", "이미 녹화 중입니다"),
    RECORDING_NOT_IN_PROGRESS(HttpStatus.CONFLICT, "R003", "녹화 중이 아닙니다"),
    STORAGE_EXCEEDED(HttpStatus.INSUFFICIENT_STORAGE, "R004", "저장 공간이 부족합니다"),
    
    // 송출
    PUBLISH_NOT_FOUND(HttpStatus.NOT_FOUND, "P001", "송출 세션을 찾을 수 없습니다"),
    NO_DESTINATIONS(HttpStatus.FAILED_DEPENDENCY, "P002", "송출할 채널이 없습니다"),
    
    // LiveKit
    LIVEKIT_ERROR(HttpStatus.SERVICE_UNAVAILABLE, "L001", "미디어 서버 오류가 발생했습니다"),
    MEDIA_SERVER_DOWN(HttpStatus.SERVICE_UNAVAILABLE, "L002", "미디어 서버에 연결할 수 없습니다");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
```

### BusinessException.java
```java
package com.onetakestudio.media.global.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    
    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
```

### GlobalExceptionHandler.java
```java
package com.onetakestudio.media.global.exception;

import com.onetakestudio.media.global.common.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.error("BusinessException: {}", e.getMessage());
        
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.error(errorCode.getCode(), errorCode.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .findFirst()
                .orElse("유효하지 않은 입력입니다");
        
        return ResponseEntity
                .badRequest()
                .body(ApiResponse.error("V001", message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("Unexpected error: ", e);
        
        return ResponseEntity
                .internalServerError()
                .body(ApiResponse.error("E001", "서버 오류가 발생했습니다"));
    }
}
```
