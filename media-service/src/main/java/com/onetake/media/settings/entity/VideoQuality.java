package com.onetake.media.settings.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum VideoQuality {
    LOW("480p", 480, 854, 1_000_000),
    MEDIUM("720p", 720, 1280, 2_500_000),
    HIGH("1080p", 1080, 1920, 5_000_000),
    ULTRA("4K", 2160, 3840, 15_000_000);

    private final String label;
    private final int height;
    private final int width;
    private final int bitrate;
}
