package com.onetake.media.marker.dto;

import com.onetake.media.marker.entity.Marker;
import com.onetake.media.marker.entity.MarkerSource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarkerResponse {

    private String markerId;
    private String studioId;
    private String recordingId;
    private Double timestampSec;
    private String formattedTime;  // "15:30" 형식
    private MarkerSource source;
    private String label;
    private Double chatSpikeRatio;
    private Boolean usedForShorts;
    private LocalDateTime createdAt;

    public static MarkerResponse from(Marker marker) {
        return MarkerResponse.builder()
                .markerId(marker.getMarkerId())
                .studioId(marker.getStudioId())
                .recordingId(marker.getRecordingId())
                .timestampSec(marker.getTimestampSec())
                .formattedTime(formatTimestamp(marker.getTimestampSec()))
                .source(marker.getSource())
                .label(marker.getLabel())
                .chatSpikeRatio(marker.getChatSpikeRatio())
                .usedForShorts(marker.getUsedForShorts())
                .createdAt(marker.getCreatedAt())
                .build();
    }

    private static String formatTimestamp(Double seconds) {
        if (seconds == null) return "00:00";
        int totalSec = seconds.intValue();
        int hours = totalSec / 3600;
        int minutes = (totalSec % 3600) / 60;
        int secs = totalSec % 60;

        if (hours > 0) {
            return String.format("%d:%02d:%02d", hours, minutes, secs);
        }
        return String.format("%02d:%02d", minutes, secs);
    }
}
