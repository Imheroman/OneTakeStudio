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

    // 프론트엔드 호환 필드 (GB 단위)
    private Double total;       // 총 용량 (GB)
    private Double used;        // 사용 용량 (GB)
    private Double available;   // 남은 용량 (GB)
    private Double videoUsage;  // 비디오 사용량 (GB)
    private Double assetUsage;  // 에셋 사용량 (GB)
    private Double shortsUsage; // 숏츠 사용량 (GB)

    // 상세 정보 (bytes 단위)
    private Long usedBytes;
    private Long limitBytes;
    private Double usedPercentage;
    private String usedFormatted;
    private String limitFormatted;

    private static final double BYTES_TO_GB = 1024.0 * 1024.0 * 1024.0;

    public static StorageResponse of(Long usedBytes, Long limitBytes) {
        return of(usedBytes, limitBytes, usedBytes, 0L, 0L);
    }

    public static StorageResponse of(Long usedBytes, Long limitBytes, Long videoBytes, Long assetBytes) {
        return of(usedBytes, limitBytes, videoBytes, assetBytes, 0L);
    }

    public static StorageResponse of(Long usedBytes, Long limitBytes, Long videoBytes, Long assetBytes, Long shortsBytes) {
        double percentage = limitBytes > 0 ? (double) usedBytes / limitBytes * 100 : 0;

        double totalGb = Math.round(limitBytes / BYTES_TO_GB * 100.0) / 100.0;
        double usedGb = Math.round(usedBytes / BYTES_TO_GB * 100.0) / 100.0;
        double availableGb = Math.round((limitBytes - usedBytes) / BYTES_TO_GB * 100.0) / 100.0;
        double videoGb = Math.round(videoBytes / BYTES_TO_GB * 100.0) / 100.0;
        double assetGb = Math.round(assetBytes / BYTES_TO_GB * 100.0) / 100.0;
        double shortsGb = Math.round(shortsBytes / BYTES_TO_GB * 100.0) / 100.0;

        return StorageResponse.builder()
                // GB 단위 (프론트엔드용)
                .total(totalGb)
                .used(usedGb)
                .available(availableGb > 0 ? availableGb : 0.0)
                .videoUsage(videoGb)
                .assetUsage(assetGb)
                .shortsUsage(shortsGb)
                // Bytes 단위 (상세)
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
