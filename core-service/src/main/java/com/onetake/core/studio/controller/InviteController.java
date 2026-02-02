package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.notification.service.NotificationService;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.studio.dto.ReceivedInviteResponse;
import com.onetake.core.studio.dto.StudioMemberResponse;
import com.onetake.core.studio.service.StudioMemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/invites")
@RequiredArgsConstructor
public class InviteController {

    private final StudioMemberService studioMemberService;
    private final NotificationService notificationService;

    @GetMapping("/received")
    public ResponseEntity<ApiResponse<List<ReceivedInviteResponse>>> getReceivedInvites(
            @CurrentUser CustomUserDetails userDetails) {

        log.debug("받은 초대 목록 조회 요청: userId={}", userDetails.getUserId());
        List<ReceivedInviteResponse> invites = studioMemberService.getReceivedInvites(userDetails.getUserId());

        return ResponseEntity.ok(ApiResponse.success("받은 초대 목록 조회 성공", invites));
    }

    @PostMapping("/{inviteId}/accept")
    public ResponseEntity<ApiResponse<StudioMemberResponse>> acceptInvite(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String inviteId) {

        log.debug("초대 수락 요청: inviteId={}", inviteId);
        StudioMemberResponse member = studioMemberService.acceptInvite(userDetails.getUserId(), inviteId);

        // 초대 관련 알림 삭제
        notificationService.deleteByReferenceId(inviteId);

        return ResponseEntity.ok(ApiResponse.success("초대를 수락했습니다", member));
    }

    @PostMapping("/{inviteId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectInvite(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String inviteId) {

        log.debug("초대 거절 요청: inviteId={}", inviteId);
        studioMemberService.rejectInvite(userDetails.getUserId(), inviteId);

        // 초대 관련 알림 삭제
        notificationService.deleteByReferenceId(inviteId);

        return ResponseEntity.ok(ApiResponse.success("초대를 거절했습니다"));
    }
}
