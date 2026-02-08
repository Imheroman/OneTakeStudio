package com.onetake.media.global.config;

import io.livekit.server.AccessToken;
import io.livekit.server.EgressServiceClient;
import io.livekit.server.IngressServiceClient;
import io.livekit.server.RoomServiceClient;
import io.livekit.server.WebhookReceiver;
import io.livekit.server.okhttp.OkHttpFactory;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

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
        return EgressServiceClient.createClient(host, apiKey, apiSecret,
                new OkHttpFactory(false, builder -> {
                    builder.connectTimeout(30, TimeUnit.SECONDS);
                    builder.readTimeout(30, TimeUnit.SECONDS);
                    builder.writeTimeout(30, TimeUnit.SECONDS);
                })
        );
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
