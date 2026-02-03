package com.onetake.storage.upload.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadInitRequest {

    @NotBlank(message = "파일명은 필수입니다")
    private String fileName;

    @NotNull(message = "파일 크기는 필수입니다")
    @Min(value = 1, message = "파일 크기는 1 이상이어야 합니다")
    private Long fileSize;

    @NotNull(message = "총 청크 수는 필수입니다")
    @Min(value = 1, message = "총 청크 수는 1 이상이어야 합니다")
    private Integer totalChunks;

    private Long recordingId;
}
