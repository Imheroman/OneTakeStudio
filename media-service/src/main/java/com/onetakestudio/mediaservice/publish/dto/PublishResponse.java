package com.onetakestudio.mediaservice.publish.dto;

import com.onetakestudio.mediaservice.publish.entity.PublishSession;
import com.onetakestudio.mediaservice.publish.entity.PublishStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class PublishResponse {

    private String publishSessionId;
    private Long studioId;
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
