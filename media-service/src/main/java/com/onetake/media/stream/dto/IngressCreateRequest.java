package com.onetake.media.stream.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class IngressCreateRequest {

    @NotBlank(message = "방 이름은 필수입니다")
    private String roomName;

    @NotBlank(message = "참가자 식별자는 필수입니다")
    private String participantIdentity;

    private String participantName;
}
