package com.onetake.core.studio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSceneRequest {

    @NotBlank(message = "씬 이름은 필수입니다.")
    @Size(max = 50, message = "씬 이름은 50자를 초과할 수 없습니다.")
    private String name;

    private SceneLayoutDto layout;
}
