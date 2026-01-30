package com.onetake.core.library.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageResponse {

    private Long usedBytes;
    private Long limitBytes;
    private Double usedPercentage;
    private String usedFormatted;
    private String limitFormatted;

    public static StorageResponse of(Long usedBytes, Long limitBytes) {
        double percentage = limitBytes > 0 ? (double) usedBytes / limitBytes * 100 : 0;

        return StorageResponse.builder()
                .usedBytes(usedBytes)
                .limitBytes(limitBytes)
                .usedPercentage(Math.round(percentage * 100.0) / 100.0)
                .usedFormatted(formatBytes(usedBytes))
                .limitFormatted(formatBytes(limitBytes))
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
}
