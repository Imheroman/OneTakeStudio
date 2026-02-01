package com.onetake.core.studio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteResponse {
    private String content;

    public static NoteResponse of(String content) {
        return NoteResponse.builder()
                .content(content != null ? content : "")
                .build();
    }
}
