package com.onetake.core.workspace.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.workspace.dto.DashboardResponse;
import com.onetake.core.workspace.dto.RecentStudioResponse;
import com.onetake.core.workspace.service.WorkspaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @GetMapping("/studios/recent")
    public ResponseEntity<ApiResponse<List<RecentStudioResponse>>> getRecentStudios(
            @CurrentUser CustomUserDetails userDetails) {
        List<RecentStudioResponse> response = workspaceService.getRecentStudios(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("최근 스튜디오 목록 조회 성공", response));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @CurrentUser CustomUserDetails userDetails) {
        DashboardResponse response = workspaceService.getDashboard(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("대시보드 조회 성공", response));
    }
}
