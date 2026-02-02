package com.onetake.media.chat.integration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

/**
 * YouTube Live Broadcast 정보 조회 서비스
 *
 * 라이브 방송의 liveChatId를 가져오는 기능 제공
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class YouTubeBroadcastService {

    private static final String YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
    private static final String LIVE_BROADCASTS_URL = YOUTUBE_API_BASE + "/liveBroadcasts";

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 현재 활성 라이브 방송의 liveChatId 조회
     *
     * @param accessToken YouTube OAuth access token
     * @return liveChatId (없으면 null)
     */
    public String getActiveLiveChatId(String accessToken) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(LIVE_BROADCASTS_URL)
                    .queryParam("part", "snippet")
                    .queryParam("broadcastStatus", "active")
                    .queryParam("broadcastType", "all")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<LiveBroadcastListResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, LiveBroadcastListResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<LiveBroadcast> items = response.getBody().getItems();
                if (items != null && !items.isEmpty()) {
                    String liveChatId = items.get(0).getSnippet().getLiveChatId();
                    log.info("Found active YouTube broadcast with liveChatId: {}", liveChatId);
                    return liveChatId;
                }
            }

            log.warn("No active YouTube broadcast found");
            return null;

        } catch (RestClientException e) {
            log.error("Failed to get YouTube broadcast info: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 예정된(upcoming) 라이브 방송의 liveChatId 조회
     */
    public String getUpcomingLiveChatId(String accessToken) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(LIVE_BROADCASTS_URL)
                    .queryParam("part", "snippet")
                    .queryParam("broadcastStatus", "upcoming")
                    .queryParam("broadcastType", "all")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<LiveBroadcastListResponse> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, LiveBroadcastListResponse.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<LiveBroadcast> items = response.getBody().getItems();
                if (items != null && !items.isEmpty()) {
                    String liveChatId = items.get(0).getSnippet().getLiveChatId();
                    log.info("Found upcoming YouTube broadcast with liveChatId: {}", liveChatId);
                    return liveChatId;
                }
            }

            log.warn("No upcoming YouTube broadcast found");
            return null;

        } catch (RestClientException e) {
            log.error("Failed to get YouTube broadcast info: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 활성 또는 예정된 방송의 liveChatId 조회 (활성 우선)
     */
    public String getLiveChatId(String accessToken) {
        // 먼저 활성 방송 확인
        String liveChatId = getActiveLiveChatId(accessToken);
        if (liveChatId != null) {
            return liveChatId;
        }

        // 없으면 예정된 방송 확인
        return getUpcomingLiveChatId(accessToken);
    }

    // ==================== DTOs ====================

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LiveBroadcastListResponse {
        private List<LiveBroadcast> items;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class LiveBroadcast {
        private String id;
        private Snippet snippet;

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Snippet {
            private String title;
            private String liveChatId;
            private String scheduledStartTime;
        }
    }
}
