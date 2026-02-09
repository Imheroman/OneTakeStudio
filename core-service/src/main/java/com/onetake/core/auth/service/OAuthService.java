package com.onetake.core.auth.service;

import com.onetake.core.auth.config.OAuthProperties;
import com.onetake.core.auth.dto.OAuthUserInfo;
import com.onetake.core.auth.entity.AuthProvider;
import com.onetake.core.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthService {

    private final RestTemplate restTemplate;
    private final OAuthProperties oAuthProperties;

    // ==================== Code -> Token 교환 ====================

    public String exchangeGoogleCodeForToken(String code, String redirectUri) {
        String tokenUrl = "https://oauth2.googleapis.com/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", oAuthProperties.getGoogle().getClientId());
        params.add("client_secret", oAuthProperties.getGoogle().getClientSecret());
        params.add("redirect_uri", redirectUri != null ? redirectUri : oAuthProperties.getGoogle().getRedirectUri());
        params.add("code", code);

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(tokenUrl, HttpMethod.POST, entity, Map.class);
            Map<String, Object> body = response.getBody();

            if (body == null || !body.containsKey("access_token")) {
                log.error("Google token exchange failed: no access_token in response");
                throw AuthException.oauthFailed("Google");
            }

            return (String) body.get("access_token");
        } catch (Exception e) {
            log.error("Google token exchange failed: {}", e.getMessage());
            throw AuthException.oauthFailed("Google");
        }
    }

    public String exchangeKakaoCodeForToken(String code, String redirectUri) {
        String tokenUrl = "https://kauth.kakao.com/oauth/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", oAuthProperties.getKakao().getClientId());
        params.add("client_secret", oAuthProperties.getKakao().getClientSecret());
        params.add("redirect_uri", redirectUri != null ? redirectUri : oAuthProperties.getKakao().getRedirectUri());
        params.add("code", code);

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(tokenUrl, HttpMethod.POST, entity, Map.class);
            Map<String, Object> body = response.getBody();

            if (body == null || !body.containsKey("access_token")) {
                log.error("Kakao token exchange failed: no access_token in response");
                throw AuthException.oauthFailed("Kakao");
            }

            return (String) body.get("access_token");
        } catch (Exception e) {
            log.error("Kakao token exchange failed: {}", e.getMessage());
            throw AuthException.oauthFailed("Kakao");
        }
    }

    public String exchangeNaverCodeForToken(String code, String redirectUri) {
        String tokenUrl = "https://nid.naver.com/oauth2.0/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", oAuthProperties.getNaver().getClientId());
        params.add("client_secret", oAuthProperties.getNaver().getClientSecret());
        params.add("redirect_uri", redirectUri != null ? redirectUri : oAuthProperties.getNaver().getRedirectUri());
        params.add("code", code);

        HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(tokenUrl, HttpMethod.POST, entity, Map.class);
            Map<String, Object> body = response.getBody();

            if (body == null || !body.containsKey("access_token")) {
                log.error("Naver token exchange failed: no access_token in response");
                throw AuthException.oauthFailed("Naver");
            }

            return (String) body.get("access_token");
        } catch (Exception e) {
            log.error("Naver token exchange failed: {}", e.getMessage());
            throw AuthException.oauthFailed("Naver");
        }
    }

    // ==================== Access Token -> 사용자 정보 조회 ====================

    public OAuthUserInfo getGoogleUserInfo(String accessToken) {
        String url = "https://www.googleapis.com/oauth2/v2/userinfo";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();

            if (body == null) {
                throw AuthException.oauthFailed("Google");
            }

            return OAuthUserInfo.builder()
                    .provider(AuthProvider.GOOGLE.name())
                    .providerId((String) body.get("id"))
                    .email((String) body.get("email"))
                    .nickname((String) body.get("name"))
                    .profileImageUrl((String) body.get("picture"))
                    .build();
        } catch (Exception e) {
            log.error("Google OAuth failed: {}", e.getMessage());
            throw AuthException.oauthFailed("Google");
        }
    }

    public OAuthUserInfo getKakaoUserInfo(String accessToken) {
        String url = "https://kapi.kakao.com/v2/user/me";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();

            if (body == null) {
                throw AuthException.oauthFailed("Kakao");
            }

            Map<String, Object> kakaoAccount = (Map<String, Object>) body.get("kakao_account");
            Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");

            return OAuthUserInfo.builder()
                    .provider(AuthProvider.KAKAO.name())
                    .providerId(String.valueOf(body.get("id")))
                    .email((String) kakaoAccount.get("email"))
                    .nickname((String) profile.get("nickname"))
                    .profileImageUrl((String) profile.get("profile_image_url"))
                    .build();
        } catch (Exception e) {
            log.error("Kakao OAuth failed: {}", e.getMessage());
            throw AuthException.oauthFailed("Kakao");
        }
    }

    public OAuthUserInfo getNaverUserInfo(String accessToken) {
        String url = "https://openapi.naver.com/v1/nid/me";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            Map<String, Object> body = response.getBody();

            if (body == null || !"00".equals(body.get("resultcode"))) {
                throw AuthException.oauthFailed("Naver");
            }

            Map<String, Object> naverResponse = (Map<String, Object>) body.get("response");

            return OAuthUserInfo.builder()
                    .provider(AuthProvider.NAVER.name())
                    .providerId((String) naverResponse.get("id"))
                    .email((String) naverResponse.get("email"))
                    .nickname((String) naverResponse.get("nickname"))
                    .profileImageUrl((String) naverResponse.get("profile_image"))
                    .build();
        } catch (Exception e) {
            log.error("Naver OAuth failed: {}", e.getMessage());
            throw AuthException.oauthFailed("Naver");
        }
    }
}
