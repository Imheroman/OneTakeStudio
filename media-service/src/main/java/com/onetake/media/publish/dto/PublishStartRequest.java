package com.onetake.media.publish.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PublishStartRequest {

    @NotBlank(message = "스튜디오 ID는 필수입니다")
    private String studioId;

    @NotEmpty(message = "송출 채널은 최소 1개 이상이어야 합니다")
    private List<Long> destinationIds; // YouTube, Chzzk 등 송출 채널 ID 목록

    private String streamSessionId; // 연결된 스트림 세션 ID
}
