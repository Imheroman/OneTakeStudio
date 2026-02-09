package com.onetake.storage.upload.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadCompleteResponse {

    private boolean success;
    private String fileUrl;
    private Long fileSize;
    private String message;

    public static UploadCompleteResponse success(String fileUrl, Long fileSize) {
        return UploadCompleteResponse.builder()
                .success(true)
                .fileUrl(fileUrl)
                .fileSize(fileSize)
                .message("File upload completed and merged successfully")
                .build();
    }

    public static UploadCompleteResponse failure(String message) {
        return UploadCompleteResponse.builder()
                .success(false)
                .message(message)
                .build();
    }
}
