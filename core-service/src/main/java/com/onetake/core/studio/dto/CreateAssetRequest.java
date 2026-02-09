package com.onetake.core.studio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateAssetRequest {

    @NotBlank(message = "에셋 타입은 필수입니다")
    private String type;  // logo, overlay, video

    @NotBlank(message = "에셋 이름은 필수입니다")
    @Size(max = 100, message = "에셋 이름은 100자 이하여야 합니다")
    private String name;

    private String fileUrl;
}
