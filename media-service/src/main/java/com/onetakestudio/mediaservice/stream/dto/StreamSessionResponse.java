package com.onetakestudio.mediaservice.stream.dto;

import com.onetakestudio.mediaservice.stream.entity.SessionStatus;
import com.onetakestudio.mediaservice.stream.entity.StreamSession;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class StreamSessionResponse {

    private Long id;
    private Long studioId;
    private Long userId;
    private String roomName;
    private String participantIdentity;
    private SessionStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;

    public static StreamSessionResponse from(StreamSession session) {
        return StreamSessionResponse.builder()
                .id(session.getId())
                .studioId(session.getStudioId())
                .userId(session.getUserId())
                .roomName(session.getRoomName())
                .participantIdentity(session.getParticipantIdentity())
                .status(session.getStatus())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .createdAt(session.getCreatedAt())
                .build();
    }
}
