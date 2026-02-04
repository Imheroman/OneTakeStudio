package com.onetake.media.publish.dto;

import com.onetake.media.publish.entity.PublishSession;
import com.onetake.media.publish.entity.PublishStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PublishResponse {

    private String publishSessionId;
    private String studioId;
    private PublishStatus status;
    private String destinationIds;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private String errorMessage;

    public static PublishResponse from(PublishSession session) {
        return PublishResponse.builder()
                .publishSessionId(session.getPublishSessionId())
                .studioId(session.getStudioId())
                .status(session.getStatus())
                .destinationIds(session.getDestinationIds())
                .startedAt(session.getStartedAt())
                .endedAt(session.getEndedAt())
                .errorMessage(session.getErrorMessage())
                .build();
    }
}
