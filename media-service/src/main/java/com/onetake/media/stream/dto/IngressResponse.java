package com.onetake.media.stream.dto;

import livekit.LivekitIngress.IngressInfo;
import livekit.LivekitIngress.IngressState;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class IngressResponse {

    private String ingressId;
    private String name;
    private String roomName;
    private String participantIdentity;
    private String participantName;

    // OBS 설정에 사용할 정보
    private String url;           // RTMP URL (rtmp://...)
    private String streamKey;     // Stream Key

    private String status;

    public static IngressResponse from(IngressInfo info) {
        return IngressResponse.builder()
                .ingressId(info.getIngressId())
                .name(info.getName())
                .roomName(info.getRoomName())
                .participantIdentity(info.getParticipantIdentity())
                .participantName(info.getParticipantName())
                .url(info.getUrl())
                .streamKey(info.getStreamKey())
                .status(info.getState() != null ? info.getState().getStatus().name() : "UNKNOWN")
                .build();
    }
}
