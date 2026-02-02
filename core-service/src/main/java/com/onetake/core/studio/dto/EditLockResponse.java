package com.onetake.core.studio.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditLockResponse {

    /**
     * 락 보유 여부
     */
    private boolean locked;

    /**
     * 락을 보유한 사용자 ID
     */
    private String lockedByUserId;

    /**
     * 락을 보유한 사용자 닉네임
     */
    private String lockedByNickname;

    /**
     * 락 획득 시간
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime acquiredAt;

    /**
     * 락 만료 시간
     */
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime expiresAt;

    /**
     * 현재 사용자가 락 보유 여부
     */
    private boolean isMyLock;

    /**
     * 락 없음 응답
     */
    public static EditLockResponse notLocked() {
        return EditLockResponse.builder()
                .locked(false)
                .isMyLock(false)
                .build();
    }

    /**
     * 락 정보 응답
     */
    public static EditLockResponse of(String lockedByUserId, String lockedByNickname,
                                       LocalDateTime acquiredAt, LocalDateTime expiresAt,
                                       String currentUserId) {
        return EditLockResponse.builder()
                .locked(true)
                .lockedByUserId(lockedByUserId)
                .lockedByNickname(lockedByNickname)
                .acquiredAt(acquiredAt)
                .expiresAt(expiresAt)
                .isMyLock(lockedByUserId.equals(currentUserId))
                .build();
    }
}
