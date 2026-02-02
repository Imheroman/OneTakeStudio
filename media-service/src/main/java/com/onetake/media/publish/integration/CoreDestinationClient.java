package com.onetake.media.publish.integration;

import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.publish.integration.dto.CoreDestinationBatchResponse;
import com.onetake.media.publish.integration.dto.CoreDestinationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;

/**
 * core-service 연동 채널(Destination) 정보 조회.
 * 송출 시 RTMP URL/Stream Key를 가져오기 위해 사용.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CoreDestinationClient {

    private final RestTemplate restTemplate;

    @Value("${core.service.url:http://localhost:8080}")
    private String coreServiceUrl;

    private static final String BATCH_PATH = "/api/destinations/internal/batch";

    /**
     * Destination ID 목록으로 연동 채널 정보 일괄 조회.
     *
     * @param destinationIds core-service ConnectedDestination 엔티티 id 목록
     * @return 조회된 Destination 목록 (없으면 빈 리스트)
     */
    public List<CoreDestinationDto> getDestinationsByIds(List<Long> destinationIds) {
        if (destinationIds == null || destinationIds.isEmpty()) {
            return Collections.emptyList();
        }

        String url = coreServiceUrl + BATCH_PATH;
        HttpEntity<List<Long>> request = new HttpEntity<>(destinationIds);

        try {
            ResponseEntity<CoreDestinationBatchResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    CoreDestinationBatchResponse.class
            );

            CoreDestinationBatchResponse body = response.getBody();
            if (body == null || !body.isSuccess() || body.getData() == null) {
                log.warn("Core destination batch 응답 비정상: success={}, data=null", body != null && body.isSuccess());
                return Collections.emptyList();
            }

            return body.getData();
        } catch (RestClientException e) {
            log.error("Core destination batch 호출 실패: url={}, ids={}", url, destinationIds, e);
            throw new BusinessException(ErrorCode.RTMP_CONNECTION_FAILED);
        }
    }
}
