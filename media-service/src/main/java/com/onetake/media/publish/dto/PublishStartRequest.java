package com.onetake.media.publish.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PublishStartRequest {

    @NotNull(message = "스튜디오 ID는 필수입니다")
    private Long studioId;

    @NotEmpty(message = "송출 채널은 최소 1개 이상이어야 합니다")
    private List<Long> destinationIds; // YouTube, Chzzk 등 송출 채널 ID 목록

    private String streamSessionId; // 연결된 스트림 세션 ID
}
