package com.onetake.storage.upload.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChunkUploadResponse {

    private boolean success;
    private int chunkIndex;
    private int uploadedChunks;
    private int totalChunks;
    private String message;

    public static ChunkUploadResponse success(int chunkIndex, int uploadedChunks, int totalChunks) {
        return ChunkUploadResponse.builder()
                .success(true)
                .chunkIndex(chunkIndex)
                .uploadedChunks(uploadedChunks)
                .totalChunks(totalChunks)
                .message("Chunk uploaded successfully")
                .build();
    }

    public static ChunkUploadResponse failure(int chunkIndex, String message) {
        return ChunkUploadResponse.builder()
                .success(false)
                .chunkIndex(chunkIndex)
                .message(message)
                .build();
    }
}
