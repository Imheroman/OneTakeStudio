package com.onetake.core.studio.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateStudioRequest {

    @Size(max = 100, message = "스튜디오 이름은 100자를 초과할 수 없습니다.")
    private String name;

    @Size(max = 500, message = "썸네일 URL은 500자를 초과할 수 없습니다.")
    private String thumbnail;
}
