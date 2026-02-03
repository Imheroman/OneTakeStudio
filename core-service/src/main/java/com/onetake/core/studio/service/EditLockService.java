package com.onetake.core.studio.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.core.studio.dto.EditLockResponse;
import com.onetake.core.studio.exception.EditLockException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EditLockService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${media-service.url:http://localhost:8082}")
    private String mediaServiceUrl;

    private static final String LOCK_KEY_PREFIX = "studio:edit-lock:";
    private static final Duration LOCK_TTL = Duration.ofMinutes(5); // 5분 후 자동 해제

    /**
     * 편집 락 획득 시도
     *
     * @param studioId 스튜디오 ID
     * @param userId   사용자 ID
     * @param nickname 사용자 닉네임
     * @return 락 획득 결과
     */
    public EditLockResponse acquireLock(Long studioId, String userId, String nickname) {
        String lockKey = LOCK_KEY_PREFIX + studioId;

        // 기존 락 확인
        String existingLock = redisTemplate.opsForValue().get(lockKey);

        if (existingLock != null) {
            Map<String, String> lockData = parseLockData(existingLock);
            String lockedUserId = lockData.get("userId");

            // 이미 내가 락을 가지고 있으면 갱신
            if (lockedUserId.equals(userId)) {
                return extendLock(studioId, userId, nickname);
            }

            // 다른 사람이 락을 가지고 있으면 실패
            throw new EditLockException(
                    lockData.get("nickname") + "님이 편집 중입니다.",
                    lockedUserId,
                    lockData.get("nickname")
            );
        }

        // 새로운 락 획득
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plus(LOCK_TTL);

        Map<String, String> lockData = new HashMap<>();
        lockData.put("userId", userId);
        lockData.put("nickname", nickname);
        lockData.put("acquiredAt", now.toString());
        lockData.put("expiresAt", expiresAt.toString());

        String lockJson = serializeLockData(lockData);

        Boolean success = redisTemplate.opsForValue()
                .setIfAbsent(lockKey, lockJson, LOCK_TTL);

        if (Boolean.TRUE.equals(success)) {
            log.info("편집 락 획득: studioId={}, userId={}, nickname={}", studioId, userId, nickname);
            // WebSocket 브로드캐스트
            broadcastLockAcquired(studioId, userId, nickname);
            return EditLockResponse.of(userId, nickname, now, expiresAt, userId);
        }

        // 동시에 다른 사람이 락을 획득한 경우
        existingLock = redisTemplate.opsForValue().get(lockKey);
        if (existingLock != null) {
            Map<String, String> otherLockData = parseLockData(existingLock);
            throw new EditLockException(
                    otherLockData.get("nickname") + "님이 편집 중입니다.",
                    otherLockData.get("userId"),
                    otherLockData.get("nickname")
            );
        }

        throw new EditLockException("락 획득에 실패했습니다. 다시 시도해주세요.", null, null);
    }

    /**
     * 편집 락 갱신 (heartbeat)
     */
    public EditLockResponse extendLock(Long studioId, String userId, String nickname) {
        String lockKey = LOCK_KEY_PREFIX + studioId;

        String existingLock = redisTemplate.opsForValue().get(lockKey);
        if (existingLock == null) {
            // 락이 없으면 새로 획득
            return acquireLock(studioId, userId, nickname);
        }

        Map<String, String> lockData = parseLockData(existingLock);
        if (!lockData.get("userId").equals(userId)) {
            throw new EditLockException(
                    lockData.get("nickname") + "님이 편집 중입니다.",
                    lockData.get("userId"),
                    lockData.get("nickname")
            );
        }

        // 락 갱신
        LocalDateTime acquiredAt = LocalDateTime.parse(lockData.get("acquiredAt"));
        LocalDateTime expiresAt = LocalDateTime.now().plus(LOCK_TTL);

        lockData.put("expiresAt", expiresAt.toString());
        String lockJson = serializeLockData(lockData);

        redisTemplate.opsForValue().set(lockKey, lockJson, LOCK_TTL);

        log.debug("편집 락 갱신: studioId={}, userId={}", studioId, userId);
        return EditLockResponse.of(userId, nickname, acquiredAt, expiresAt, userId);
    }

    /**
     * 편집 락 해제
     */
    public void releaseLock(Long studioId, String userId) {
        String lockKey = LOCK_KEY_PREFIX + studioId;

        String existingLock = redisTemplate.opsForValue().get(lockKey);
        if (existingLock == null) {
            log.debug("해제할 락이 없음: studioId={}", studioId);
            return;
        }

        Map<String, String> lockData = parseLockData(existingLock);
        if (!lockData.get("userId").equals(userId)) {
            throw new EditLockException(
                    "본인의 락만 해제할 수 있습니다.",
                    lockData.get("userId"),
                    lockData.get("nickname")
            );
        }

        String nickname = lockData.get("nickname");
        redisTemplate.delete(lockKey);
        log.info("편집 락 해제: studioId={}, userId={}", studioId, userId);
        // WebSocket 브로드캐스트
        broadcastLockReleased(studioId, userId, nickname);
    }

    /**
     * 편집 락 상태 조회
     */
    public EditLockResponse getLockStatus(Long studioId, String currentUserId) {
        String lockKey = LOCK_KEY_PREFIX + studioId;

        String existingLock = redisTemplate.opsForValue().get(lockKey);
        if (existingLock == null) {
            return EditLockResponse.notLocked();
        }

        Map<String, String> lockData = parseLockData(existingLock);
        return EditLockResponse.of(
                lockData.get("userId"),
                lockData.get("nickname"),
                LocalDateTime.parse(lockData.get("acquiredAt")),
                LocalDateTime.parse(lockData.get("expiresAt")),
                currentUserId
        );
    }

    /**
     * 편집 락 강제 해제 (관리자/호스트용)
     */
    public void forceReleaseLock(Long studioId) {
        String lockKey = LOCK_KEY_PREFIX + studioId;

        // 기존 락 정보 조회 (브로드캐스트용)
        String existingLock = redisTemplate.opsForValue().get(lockKey);
        String userId = null;
        String nickname = null;
        if (existingLock != null) {
            Map<String, String> lockData = parseLockData(existingLock);
            userId = lockData.get("userId");
            nickname = lockData.get("nickname");
        }

        redisTemplate.delete(lockKey);
        log.info("편집 락 강제 해제: studioId={}", studioId);

        // WebSocket 브로드캐스트
        if (userId != null) {
            broadcastLockReleased(studioId, userId, nickname);
        }
    }

    /**
     * 락 획득 브로드캐스트 (media-service로 전송)
     */
    @Async
    public void broadcastLockAcquired(Long studioId, String userId, String nickname) {
        try {
            String url = mediaServiceUrl + "/api/internal/studio/" + studioId + "/lock/acquired";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("userId", userId);
            body.put("nickname", nickname);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, Map.class);

            log.debug("락 획득 브로드캐스트 성공: studioId={}", studioId);
        } catch (Exception e) {
            log.warn("락 획득 브로드캐스트 실패: studioId={}, error={}", studioId, e.getMessage());
        }
    }

    /**
     * 락 해제 브로드캐스트 (media-service로 전송)
     */
    @Async
    public void broadcastLockReleased(Long studioId, String userId, String nickname) {
        try {
            String url = mediaServiceUrl + "/api/internal/studio/" + studioId + "/lock/released";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> body = new HashMap<>();
            body.put("userId", userId);
            body.put("nickname", nickname != null ? nickname : "");

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity(url, request, Map.class);

            log.debug("락 해제 브로드캐스트 성공: studioId={}", studioId);
        } catch (Exception e) {
            log.warn("락 해제 브로드캐스트 실패: studioId={}, error={}", studioId, e.getMessage());
        }
    }

    private String serializeLockData(Map<String, String> lockData) {
        try {
            return objectMapper.writeValueAsString(lockData);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("락 데이터 직렬화 실패", e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseLockData(String lockJson) {
        try {
            return objectMapper.readValue(lockJson, Map.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("락 데이터 파싱 실패", e);
        }
    }
}
