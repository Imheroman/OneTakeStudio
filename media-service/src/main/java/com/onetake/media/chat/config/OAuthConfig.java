package com.onetake.media.chat.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
@Setter
public class OAuthConfig {

    private final YouTubeOAuthProperties youtube;
    private final ChzzkOAuthProperties chzzk;
    private final CommonOAuthProperties oauth;

    public OAuthConfig(YouTubeOAuthProperties youtube,
                       ChzzkOAuthProperties chzzk,
                       CommonOAuthProperties oauth) {
        this.youtube = youtube;
        this.chzzk = chzzk;
        this.oauth = oauth;
    }

    @Configuration
    @ConfigurationProperties(prefix = "youtube.oauth")
    @Getter
    @Setter
    public static class YouTubeOAuthProperties {
        private String clientId;
        private String clientSecret;
        private String redirectUri;
        private String scope;

        public static final String AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
        public static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
        public static final String REVOKE_URL = "https://oauth2.googleapis.com/revoke";
    }

    @Configuration
    @ConfigurationProperties(prefix = "chzzk.oauth")
    @Getter
    @Setter
    public static class ChzzkOAuthProperties {
        private String clientId;
        private String clientSecret;
        private String redirectUri;

        public static final String AUTH_URL = "https://nid.naver.com/oauth2.0/authorize";
        public static final String TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
    }

    @Configuration
    @ConfigurationProperties(prefix = "oauth")
    @Getter
    @Setter
    public static class CommonOAuthProperties {
        private String frontendRedirectUri;
    }
}
