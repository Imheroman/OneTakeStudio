package com.onetake.media.settings.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum AudioQuality {
    LOW("Low", 64_000, 22050),
    MEDIUM("Medium", 128_000, 44100),
    HIGH("High", 256_000, 48000),
    STUDIO("Studio", 320_000, 48000);

    private final String label;
    private final int bitrate;
    private final int sampleRate;
}
