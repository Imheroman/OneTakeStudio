package com.onetake.media.global.resolver;

import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 외부 UUID를 내부 Long ID로 변환하는 서비스
 * core-service의 내부 API를 호출하여 변환
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudioIdResolver {

    private final RestTemplate restTemplate;

    @Value("${core.service.url:http://localhost:8080}")
    private String coreServiceUrl;

    // 간단한 인메모리 캐시 (TTL 없이 영구 저장, 스튜디오 ID는 변경되지 않으므로 안전)
    private final ConcurrentHashMap<String, Long> idCache = new ConcurrentHashMap<>();

    /**
     * 스튜디오 UUID를 내부 Long ID로 변환
     * @param studioUuid 외부 UUID (예: "550e8400-e29b-41d4-a716-446655440000")
     * @return 내부 Long ID
     */
    public Long resolveStudioId(String studioUuid) {
        // 캐시에서 먼저 조회
        Long cachedId = idCache.get(studioUuid);
        if (cachedId != null) {
            log.debug("스튜디오 ID 캐시 히트: uuid={} -> id={}", studioUuid, cachedId);
            return cachedId;
        }
        log.debug("스튜디오 ID 변환 요청: uuid={}", studioUuid);

        try {
            String url = coreServiceUrl + "/api/internal/studios/by-uuid/" + studioUuid;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                Object data = body.get("data");
                if (data instanceof Map) {
                    Map<String, Object> dataMap = (Map<String, Object>) data;
                    Object idObj = dataMap.get("id");
                    if (idObj instanceof Number) {
                        Long id = ((Number) idObj).longValue();
                        log.debug("스튜디오 ID 변환 완료: uuid={} -> id={}", studioUuid, id);
                        idCache.put(studioUuid, id); // 캐시에 저장
                        return id;
                    }
                }
            }

            log.error("스튜디오 ID 조회 실패: uuid={}, response={}", studioUuid, response);
            throw new BusinessException(ErrorCode.STUDIO_NOT_FOUND);

        } catch (RestClientException e) {
            log.error("core-service 호출 실패: uuid={}", studioUuid, e);
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 스튜디오 UUID가 유효한지 검증
     */
    public boolean isValidStudioUuid(String studioUuid) {
        try {
            resolveStudioId(studioUuid);
            return true;
        } catch (BusinessException e) {
            return false;
        }
    }
}
