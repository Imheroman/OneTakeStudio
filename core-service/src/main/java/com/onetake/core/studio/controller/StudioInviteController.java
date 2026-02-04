package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.studio.dto.InviteResponse;
import com.onetake.core.studio.service.StudioMemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/studios/{studioId}/invites")
@RequiredArgsConstructor
public class StudioInviteController {

    private final StudioMemberService studioMemberService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<InviteResponse>>> getStudioInvites(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String studioId) {

        log.debug("스튜디오 초대 목록 조회 요청: studioId={}", studioId);
        List<InviteResponse> invites = studioMemberService.getStudioInvites(userDetails.getUserId(), studioId);

        return ResponseEntity.ok(ApiResponse.success("초대 목록 조회 성공", invites));
    }

    @DeleteMapping("/{inviteId}")
    public ResponseEntity<ApiResponse<Void>> cancelInvite(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String studioId,
            @PathVariable String inviteId) {

        log.debug("초대 취소 요청: studioId={}, inviteId={}", studioId, inviteId);
        studioMemberService.cancelInvite(userDetails.getUserId(), studioId, inviteId);

        return ResponseEntity.ok(ApiResponse.success("초대가 취소되었습니다"));
    }
}
