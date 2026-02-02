package com.onetake.core.studio.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.studio.dto.*;
import com.onetake.core.studio.service.StudioMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/studios/{studioId}/members")
@RequiredArgsConstructor
public class StudioMemberController {

    private final StudioMemberService studioMemberService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudioMemberResponse>>> getMembers(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable Long studioId) {

        log.debug("멤버 목록 조회 요청: studioId={}", studioId);
        List<StudioMemberResponse> members = studioMemberService.getMembers(userDetails.getUserId(), studioId);

        return ResponseEntity.ok(ApiResponse.success("멤버 목록 조회 성공", members));
    }

    @PostMapping("/invite")
    public ResponseEntity<ApiResponse<InviteResponse>> inviteMember(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable Long studioId,
            @Valid @RequestBody InviteMemberRequest request) {

        log.debug("멤버 초대 요청: studioId={}, email={}", studioId, request.getEmail());
        InviteResponse invite = studioMemberService.inviteMember(userDetails.getUserId(), studioId, request);

        return ResponseEntity.ok(ApiResponse.success("초대가 발송되었습니다", invite));
    }

    @PostMapping("/{memberId}/kick")
    public ResponseEntity<ApiResponse<Void>> kickMember(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable Long studioId,
            @PathVariable Long memberId) {

        log.debug("멤버 강퇴 요청: studioId={}, memberId={}", studioId, memberId);
        studioMemberService.kickMember(userDetails.getUserId(), studioId, memberId);

        return ResponseEntity.ok(ApiResponse.success("멤버가 스튜디오에서 제거되었습니다"));
    }

    @PatchMapping("/{memberId}")
    public ResponseEntity<ApiResponse<StudioMemberResponse>> updateMemberRole(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable Long studioId,
            @PathVariable Long memberId,
            @Valid @RequestBody UpdateMemberRoleRequest request) {

        log.debug("멤버 역할 변경 요청: studioId={}, memberId={}, role={}", studioId, memberId, request.getRole());
        StudioMemberResponse member = studioMemberService.updateMemberRole(
                userDetails.getUserId(), studioId, memberId, request);

        return ResponseEntity.ok(ApiResponse.success("멤버 역할 변경 성공", member));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> leaveStudio(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable Long studioId) {

        log.debug("스튜디오 탈퇴 요청: studioId={}", studioId);
        studioMemberService.leaveStudio(userDetails.getUserId(), studioId);

        return ResponseEntity.ok(ApiResponse.success("스튜디오에서 탈퇴했습니다"));
    }
}
