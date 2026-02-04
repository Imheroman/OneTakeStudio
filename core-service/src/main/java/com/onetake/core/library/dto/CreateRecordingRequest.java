package com.onetake.core.library.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CreateRecordingRequest {

    @NotNull(message = "스튜디오 ID는 필수입니다")
    private String studioId;

    @Size(max = 200, message = "제목은 200자 이내로 입력해주세요")
    private String title;

    @Size(max = 1000, message = "설명은 1000자 이내로 입력해주세요")
    private String description;

    private Long mediaRecordingId;
}
