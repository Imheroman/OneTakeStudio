package com.onetake.media.shorts.client;

import com.onetake.media.shorts.dto.AiShortsRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * AI 서비스 API 클라이언트
 *
 * AI 서버에 숏츠 생성 요청을 전송
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiServiceClient {

    private final RestTemplate restTemplate;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    @Value("${ai.service.api-key:}")
    private String apiKey;

    /**
     * AI 숏츠 생성 요청
     *
     * @param request 요청 데이터
     * @return 요청 성공 여부
     */
    public boolean requestShortsGeneration(AiShortsRequest request) {
        String url = aiServiceUrl + "/shorts/process";

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            if (apiKey != null && !apiKey.isBlank()) {
                headers.set("X-API-Key", apiKey);
            }

            HttpEntity<AiShortsRequest> entity = new HttpEntity<>(request, headers);

            log.info("Requesting AI shorts generation: jobId={}, videoPath={}",
                    request.getJobId(),
                    request.getVideos().isEmpty() ? null : request.getVideos().get(0).getVideoPath());

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("AI shorts request accepted: jobId={}", request.getJobId());
                return true;
            } else {
                log.error("AI shorts request failed: jobId={}, status={}",
                        request.getJobId(), response.getStatusCode());
                return false;
            }

        } catch (RestClientException e) {
            log.error("Failed to call AI service: jobId={}, error={}",
                    request.getJobId(), e.getMessage());
            return false;
        }
    }

    /**
     * AI 서버 헬스체크
     */
    public boolean isHealthy() {
        String url = aiServiceUrl + "/health";

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (RestClientException e) {
            log.warn("AI service health check failed: {}", e.getMessage());
            return false;
        }
    }
}
