package com.onetakestudio.mediaservice.stream.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StreamTokenRequest {

    @NotNull(message = "스튜디오 ID는 필수입니다")
    private Long studioId;

    @NotBlank(message = "참가자 이름은 필수입니다")
    private String participantName;

    private String metadata;

    private boolean canPublish;
    private boolean canSubscribe;
    private boolean canPublishData;
}
