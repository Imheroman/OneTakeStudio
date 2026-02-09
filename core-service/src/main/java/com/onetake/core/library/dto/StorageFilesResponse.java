package com.onetake.core.library.dto;

import com.onetake.core.library.entity.Recording;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageFilesResponse {

    private List<StorageFileItem> files;
    private int totalPages;
    private long totalElements;
    private int currentPage;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StorageFileItem {
        private String id;
        private String title;
        private String name;
        private String date;
        private String uploadedAt;
        private String size;
        private Long sizeBytes;
        private String type;
        private String status;
        private String thumbnailUrl;
    }

    public static StorageFilesResponse from(Page<Recording> recordings) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        List<StorageFileItem> files = recordings.getContent().stream()
                .map(r -> StorageFileItem.builder()
                        .id(r.getRecordingId())
                        .title(r.getTitle())
                        .name(r.getTitle())
                        .date(r.getCreatedAt() != null ? r.getCreatedAt().format(formatter) : null)
                        .uploadedAt(r.getCreatedAt() != null ? r.getCreatedAt().toString() : null)
                        .size(formatBytes(r.getFileSize()))
                        .sizeBytes(r.getFileSize())
                        .type("Recording")
                        .status(mapStatus(r.getStatus().name()))
                        .thumbnailUrl(r.getThumbnailUrl())
                        .build())
                .collect(Collectors.toList());

        return StorageFilesResponse.builder()
                .files(files)
                .totalPages(recordings.getTotalPages())
                .totalElements(recordings.getTotalElements())
                .currentPage(recordings.getNumber())
                .build();
    }

    private static String formatBytes(Long bytes) {
        if (bytes == null || bytes == 0) return "0 B";

        String[] units = {"B", "KB", "MB", "GB", "TB"};
        int unitIndex = 0;
        double size = bytes;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return String.format("%.2f %s", size, units[unitIndex]);
    }

    private static String mapStatus(String status) {
        return switch (status) {
            case "READY" -> "Uploaded";
            case "RECORDING" -> "Recording";
            case "PROCESSING" -> "Processing";
            case "FAILED" -> "Failed";
            case "DELETED" -> "Deleted";
            default -> status;
        };
    }
}
