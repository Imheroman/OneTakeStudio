package com.onetake.media.stream.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StreamTokenRequest {

    @NotBlank(message = "스튜디오 ID는 필수입니다")
    private String studioId;

    @NotBlank(message = "참가자 이름은 필수입니다")
    private String participantName;

    private String metadata;

    private boolean canPublish;
    private boolean canSubscribe;
    private boolean canPublishData;
}
