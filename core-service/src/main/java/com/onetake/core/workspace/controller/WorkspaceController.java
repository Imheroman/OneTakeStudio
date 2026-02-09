package com.onetake.core.workspace.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.workspace.dto.DashboardResponse;
import com.onetake.core.workspace.dto.RecentStudioListResponse;
import com.onetake.core.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspace")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @GetMapping("/{userId}/studios/recent")
    public ResponseEntity<RecentStudioListResponse> getRecentStudios(
            @PathVariable String userId,
            @CurrentUser CustomUserDetails userDetails) {
        RecentStudioListResponse response = workspaceService.getRecentStudios(userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @CurrentUser CustomUserDetails userDetails) {
        DashboardResponse response = workspaceService.getDashboard(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("대시보드 조회 성공", response));
    }
}
