package com.onetake.core.studio.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateStudioRequest {

    @Size(max = 100, message = "스튜디오 이름은 100자를 초과할 수 없습니다.")
    private String name;

    @Size(max = 100, message = "스튜디오 제목은 100자를 초과할 수 없습니다.")
    private String title;

    @Size(max = 500, message = "설명은 500자를 초과할 수 없습니다.")
    private String description;

    @Size(max = 50, message = "템플릿 이름은 50자를 초과할 수 없습니다.")
    private String template;

    private String transmissionType;

    private String storageLocation;

    private List<String> platforms;

    /**
     * name 또는 title 중 유효한 값을 반환.
     * 프론트엔드는 title, 기존 API는 name을 사용.
     */
    public String getEffectiveName() {
        if (name != null && !name.isBlank()) {
            return name;
        }
        if (title != null && !title.isBlank()) {
            return title;
        }
        return null;
    }
}
