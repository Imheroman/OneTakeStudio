package com.onetake.media.chat.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.chat.config.OAuthConfig;
import com.onetake.media.chat.config.OAuthConfig.ChzzkOAuthProperties;
import com.onetake.media.chat.config.OAuthConfig.YouTubeOAuthProperties;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.entity.PlatformToken;
import com.onetake.media.chat.repository.PlatformTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthService {

    private final OAuthConfig oAuthConfig;
    private final PlatformTokenRepository platformTokenRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public String getAuthorizationUrl(ChatPlatform platform, Long userId, String studioId) {
        String state = encodeState(userId, studioId);

        return switch (platform) {
            case YOUTUBE -> buildYouTubeAuthUrl(state);
            case CHZZK -> buildChzzkAuthUrl(state);
            default -> throw new IllegalArgumentException("Unsupported platform: " + platform);
        };
    }

    private String buildYouTubeAuthUrl(String state) {
        YouTubeOAuthProperties youtube = oAuthConfig.getYoutube();

        return YouTubeOAuthProperties.AUTH_URL +
                "?client_id=" + encode(youtube.getClientId()) +
                "&redirect_uri=" + encode(youtube.getRedirectUri()) +
                "&response_type=code" +
                "&scope=" + encode(youtube.getScope()) +
                "&access_type=offline" +
                "&prompt=consent" +
                "&state=" + encode(state);
    }

    private String buildChzzkAuthUrl(String state) {
        ChzzkOAuthProperties chzzk = oAuthConfig.getChzzk();

        return ChzzkOAuthProperties.AUTH_URL +
                "?client_id=" + encode(chzzk.getClientId()) +
                "&redirect_uri=" + encode(chzzk.getRedirectUri()) +
                "&response_type=code" +
                "&state=" + encode(state);
    }

    @Transactional
    public PlatformToken exchangeCodeForToken(ChatPlatform platform, String code, String state) {
        StateInfo stateInfo = decodeState(state);

        return switch (platform) {
            case YOUTUBE -> exchangeYouTubeCode(code, stateInfo);
            case CHZZK -> exchangeChzzkCode(code, stateInfo);
            default -> throw new IllegalArgumentException("Unsupported platform: " + platform);
        };
    }

    private PlatformToken exchangeYouTubeCode(String code, StateInfo stateInfo) {
        YouTubeOAuthProperties youtube = oAuthConfig.getYoutube();

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", youtube.getClientId());
        params.add("client_secret", youtube.getClientSecret());
        params.add("redirect_uri", youtube.getRedirectUri());
        params.add("grant_type", "authorization_code");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    YouTubeOAuthProperties.TOKEN_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());

                String accessToken = root.get("access_token").asText();
                String refreshToken = root.has("refresh_token") ? root.get("refresh_token").asText() : null;
                int expiresIn = root.has("expires_in") ? root.get("expires_in").asInt() : 3600;

                return saveToken(
                        stateInfo.userId(),
                        stateInfo.studioId(),
                        ChatPlatform.YOUTUBE,
                        accessToken,
                        refreshToken,
                        LocalDateTime.now().plusSeconds(expiresIn)
                );
            }
        } catch (Exception e) {
            log.error("[YouTube] Failed to exchange code for token: {}", e.getMessage());
            throw new RuntimeException("Failed to exchange YouTube authorization code", e);
        }

        throw new RuntimeException("Failed to exchange YouTube authorization code");
    }

    private PlatformToken exchangeChzzkCode(String code, StateInfo stateInfo) {
        ChzzkOAuthProperties chzzk = oAuthConfig.getChzzk();

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", chzzk.getClientId());
        params.add("client_secret", chzzk.getClientSecret());
        params.add("redirect_uri", chzzk.getRedirectUri());
        params.add("grant_type", "authorization_code");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    ChzzkOAuthProperties.TOKEN_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());

                String accessToken = root.get("access_token").asText();
                String refreshToken = root.has("refresh_token") ? root.get("refresh_token").asText() : null;
                int expiresIn = root.has("expires_in") ? root.get("expires_in").asInt() : 3600;

                return saveToken(
                        stateInfo.userId(),
                        stateInfo.studioId(),
                        ChatPlatform.CHZZK,
                        accessToken,
                        refreshToken,
                        LocalDateTime.now().plusSeconds(expiresIn)
                );
            }
        } catch (Exception e) {
            log.error("[Chzzk] Failed to exchange code for token: {}", e.getMessage());
            throw new RuntimeException("Failed to exchange Chzzk authorization code", e);
        }

        throw new RuntimeException("Failed to exchange Chzzk authorization code");
    }

    @Transactional
    public PlatformToken refreshToken(ChatPlatform platform, Long userId) {
        PlatformToken token = platformTokenRepository.findByUserIdAndPlatform(userId, platform)
                .orElseThrow(() -> new RuntimeException("Token not found for user: " + userId));

        if (token.getRefreshToken() == null) {
            throw new RuntimeException("No refresh token available");
        }

        return switch (platform) {
            case YOUTUBE -> refreshYouTubeToken(token);
            case CHZZK -> refreshChzzkToken(token);
            default -> throw new IllegalArgumentException("Unsupported platform: " + platform);
        };
    }

    private PlatformToken refreshYouTubeToken(PlatformToken token) {
        YouTubeOAuthProperties youtube = oAuthConfig.getYoutube();

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("refresh_token", token.getRefreshToken());
        params.add("client_id", youtube.getClientId());
        params.add("client_secret", youtube.getClientSecret());
        params.add("grant_type", "refresh_token");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    YouTubeOAuthProperties.TOKEN_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());

                String newAccessToken = root.get("access_token").asText();
                int expiresIn = root.has("expires_in") ? root.get("expires_in").asInt() : 3600;

                token.setAccessToken(newAccessToken);
                token.setExpiresAt(LocalDateTime.now().plusSeconds(expiresIn));

                log.info("[YouTube] Token refreshed for userId: {}", token.getUserId());
                return platformTokenRepository.save(token);
            }
        } catch (Exception e) {
            log.error("[YouTube] Failed to refresh token: {}", e.getMessage());
            throw new RuntimeException("Failed to refresh YouTube token", e);
        }

        throw new RuntimeException("Failed to refresh YouTube token");
    }

    private PlatformToken refreshChzzkToken(PlatformToken token) {
        ChzzkOAuthProperties chzzk = oAuthConfig.getChzzk();

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("refresh_token", token.getRefreshToken());
        params.add("client_id", chzzk.getClientId());
        params.add("client_secret", chzzk.getClientSecret());
        params.add("grant_type", "refresh_token");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    ChzzkOAuthProperties.TOKEN_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode root = objectMapper.readTree(response.getBody());

                String newAccessToken = root.get("access_token").asText();
                int expiresIn = root.has("expires_in") ? root.get("expires_in").asInt() : 3600;

                token.setAccessToken(newAccessToken);
                token.setExpiresAt(LocalDateTime.now().plusSeconds(expiresIn));

                log.info("[Chzzk] Token refreshed for userId: {}", token.getUserId());
                return platformTokenRepository.save(token);
            }
        } catch (Exception e) {
            log.error("[Chzzk] Failed to refresh token: {}", e.getMessage());
            throw new RuntimeException("Failed to refresh Chzzk token", e);
        }

        throw new RuntimeException("Failed to refresh Chzzk token");
    }

    @Transactional
    public PlatformToken saveToken(Long userId, String studioId, ChatPlatform platform,
                                   String accessToken, String refreshToken, LocalDateTime expiresAt) {
        PlatformToken token = platformTokenRepository.findByUserIdAndPlatform(userId, platform)
                .orElse(PlatformToken.builder()
                        .userId(userId)
                        .platform(platform)
                        .build());

        token.setStudioId(studioId);
        token.setAccessToken(accessToken);
        token.setRefreshToken(refreshToken);
        token.setExpiresAt(expiresAt);

        log.info("Token saved: userId={}, platform={}", userId, platform);
        return platformTokenRepository.save(token);
    }

    @Transactional(readOnly = true)
    public Optional<PlatformToken> getToken(Long userId, ChatPlatform platform) {
        return platformTokenRepository.findByUserIdAndPlatform(userId, platform);
    }

    @Transactional(readOnly = true)
    public List<PlatformToken> getTokensByUserId(Long userId) {
        return platformTokenRepository.findByUserId(userId);
    }

    @Transactional
    public PlatformToken getValidToken(Long userId, ChatPlatform platform) {
        PlatformToken token = platformTokenRepository.findByUserIdAndPlatform(userId, platform)
                .orElseThrow(() -> new RuntimeException("Token not found"));

        if (token.isExpiringSoon() && token.getRefreshToken() != null) {
            return refreshToken(platform, userId);
        }

        return token;
    }

    @Transactional
    public void revokeToken(ChatPlatform platform, Long userId) {
        Optional<PlatformToken> tokenOpt = platformTokenRepository.findByUserIdAndPlatform(userId, platform);

        if (tokenOpt.isPresent()) {
            PlatformToken token = tokenOpt.get();

            // YouTube는 revoke API 호출
            if (platform == ChatPlatform.YOUTUBE && token.getAccessToken() != null) {
                try {
                    String revokeUrl = YouTubeOAuthProperties.REVOKE_URL + "?token=" + token.getAccessToken();
                    restTemplate.postForEntity(revokeUrl, null, String.class);
                    log.info("[YouTube] Token revoked for userId: {}", userId);
                } catch (Exception e) {
                    log.warn("[YouTube] Failed to revoke token: {}", e.getMessage());
                }
            }

            platformTokenRepository.deleteByUserIdAndPlatform(userId, platform);
            log.info("Token deleted: userId={}, platform={}", userId, platform);
        }
    }

    @Transactional
    public PlatformToken updateLiveChatId(Long userId, ChatPlatform platform, String liveChatId, String broadcastId) {
        PlatformToken token = platformTokenRepository.findByUserIdAndPlatform(userId, platform)
                .orElseThrow(() -> new RuntimeException("Token not found"));

        token.setLiveChatId(liveChatId);
        token.setBroadcastId(broadcastId);

        return platformTokenRepository.save(token);
    }

    @Transactional
    public PlatformToken updateChannelId(Long userId, ChatPlatform platform, String channelId) {
        PlatformToken token = platformTokenRepository.findByUserIdAndPlatform(userId, platform)
                .orElseThrow(() -> new RuntimeException("Token not found"));

        token.setChannelId(channelId);

        return platformTokenRepository.save(token);
    }

    public String getFrontendRedirectUri() {
        return oAuthConfig.getOauth().getFrontendRedirectUri();
    }

    // State 인코딩/디코딩 (userId:studioId:uuid)
    private String encodeState(Long userId, String studioId) {
        return userId + ":" + (studioId != null ? studioId : "0") + ":" + UUID.randomUUID();
    }

    private StateInfo decodeState(String state) {
        String[] parts = state.split(":");
        if (parts.length < 2) {
            throw new IllegalArgumentException("Invalid state format");
        }
        Long userId = Long.parseLong(parts[0]);
        String studioId = "0".equals(parts[1]) ? null : parts[1];
        return new StateInfo(userId, studioId);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record StateInfo(Long userId, String studioId) {}
}
