package com.onetake.media.marker.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateMarkerRequest {

    @NotNull(message = "스튜디오 ID는 필수입니다")
    private Long studioId;

    private String recordingId;

    @NotNull(message = "타임스탬프는 필수입니다")
    private Double timestampSec;

    private String label;
}
