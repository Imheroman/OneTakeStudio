package com.onetake.core.studio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditLockRequest {

    /**
     * 락 갱신 시 사용 (heartbeat)
     */
    private Boolean extend;
}
