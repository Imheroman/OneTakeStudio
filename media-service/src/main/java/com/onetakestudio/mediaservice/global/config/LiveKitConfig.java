package com.onetakestudio.mediaservice.global.config;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomServiceClient;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
public class LiveKitConfig {

    @Value("${livekit.api.key}")
    private String apiKey;

    @Value("${livekit.api.secret}")
    private String apiSecret;

    @Value("${livekit.host}")
    private String host;

    @Bean
    public RoomServiceClient roomServiceClient() {
        return RoomServiceClient.createClient(host, apiKey, apiSecret);
    }

    public AccessToken createAccessToken() {
        return new AccessToken(apiKey, apiSecret);
    }
}
