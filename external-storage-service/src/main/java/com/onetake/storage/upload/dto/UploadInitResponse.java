package com.onetake.storage.upload.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadInitResponse {

    private String uploadId;
    private String message;

    public static UploadInitResponse of(String uploadId) {
        return UploadInitResponse.builder()
                .uploadId(uploadId)
                .message("Upload session initialized successfully")
                .build();
    }
}
