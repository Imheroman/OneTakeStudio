package com.onetake.core.favorite.controller;

import com.onetake.core.favorite.dto.AddFavoriteRequest;
import com.onetake.core.favorite.dto.AddFavoriteResponse;
import com.onetake.core.favorite.dto.FavoriteListResponse;
import com.onetake.core.favorite.dto.FavoriteRequestResponse;
import com.onetake.core.favorite.service.FavoriteService;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.user.dto.UserSearchResponse;
import com.onetake.core.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final UserService userService;
    private final FavoriteService favoriteService;

    /**
     * 즐겨찾기 목록 조회
     */
    @GetMapping
    public ResponseEntity<FavoriteListResponse> getFavorites(
            @CurrentUser CustomUserDetails userDetails) {
        FavoriteListResponse response = favoriteService.getFavorites(userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    /**
     * 즐겨찾기 요청 보내기
     */
    @PostMapping
    public ResponseEntity<AddFavoriteResponse> sendFavoriteRequest(
            @CurrentUser CustomUserDetails userDetails,
            @RequestBody @Valid AddFavoriteRequest request) {
        AddFavoriteResponse response = favoriteService.sendFavoriteRequest(userDetails.getUserId(), request);
        return ResponseEntity.ok(response);
    }

    /**
     * 즐겨찾기 삭제
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, String>> deleteFavorite(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String userId) {
        favoriteService.deleteFavorite(userDetails.getUserId(), userId);
        return ResponseEntity.ok(Map.of("message", "즐겨찾기에서 삭제되었습니다."));
    }

    /**
     * 사용자 검색 (이메일 또는 닉네임)
     */
    @GetMapping("/search")
    public ResponseEntity<UserSearchResponse> searchUsers(
            @RequestParam("q") String query,
            @CurrentUser CustomUserDetails userDetails) {
        UserSearchResponse response = userService.searchUsers(query, userDetails.getUserId());
        return ResponseEntity.ok(response);
    }

    // ==================== 요청 관련 API ====================

    /**
     * 받은 즐겨찾기 요청 목록 조회
     */
    @GetMapping("/requests")
    public ResponseEntity<List<FavoriteRequestResponse>> getPendingRequests(
            @CurrentUser CustomUserDetails userDetails) {
        List<FavoriteRequestResponse> requests = favoriteService.getPendingRequests(userDetails.getUserId());
        return ResponseEntity.ok(requests);
    }

    /**
     * 즐겨찾기 요청 수락
     */
    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<Map<String, String>> acceptRequest(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String requestId) {
        favoriteService.acceptRequest(userDetails.getUserId(), requestId);
        return ResponseEntity.ok(Map.of("message", "즐겨찾기 요청을 수락했습니다."));
    }

    /**
     * 즐겨찾기 요청 거절
     */
    @PostMapping("/requests/{requestId}/decline")
    public ResponseEntity<Map<String, String>> declineRequest(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String requestId) {
        favoriteService.declineRequest(userDetails.getUserId(), requestId);
        return ResponseEntity.ok(Map.of("message", "즐겨찾기 요청을 거절했습니다."));
    }
}
