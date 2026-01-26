package com.onetakestudio.mediaservice.stream.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class IceServerResponse {

    private List<IceServer> iceServers;

    @Getter
    @Builder
    public static class IceServer {
        private List<String> urls;
        private String username;
        private String credential;
    }
}
