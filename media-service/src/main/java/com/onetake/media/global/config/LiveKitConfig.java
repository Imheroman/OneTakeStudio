package com.onetake.media.global.config;

import io.livekit.server.AccessToken;
import io.livekit.server.EgressServiceClient;
import io.livekit.server.IngressServiceClient;
import io.livekit.server.RoomServiceClient;
import io.livekit.server.WebhookReceiver;
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

    @Value("${livekit.public-url:${livekit.host}}")
    private String publicUrl;

    @Bean
    public RoomServiceClient roomServiceClient() {
        return RoomServiceClient.createClient(host, apiKey, apiSecret);
    }

    @Bean
    public EgressServiceClient egressServiceClient() {
        return EgressServiceClient.createClient(host, apiKey, apiSecret);
    }

    @Bean
    public IngressServiceClient ingressServiceClient() {
        return IngressServiceClient.createClient(host, apiKey, apiSecret);
    }

    @Bean
    public WebhookReceiver webhookReceiver() {
        return new WebhookReceiver(apiKey, apiSecret);
    }

    public AccessToken createAccessToken() {
        return new AccessToken(apiKey, apiSecret);
    }
}
