package com.onetake.core.destination.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.destination.dto.CreateDestinationRequest;
import com.onetake.core.destination.dto.DestinationResponse;
import com.onetake.core.destination.dto.DestinationInternalResponse;
import com.onetake.core.destination.dto.UpdateDestinationRequest;
import com.onetake.core.destination.service.DestinationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/destinations")
@RequiredArgsConstructor
public class DestinationController {

    private final DestinationService destinationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getMyDestinations(
            @CurrentUser CustomUserDetails userDetails) {
        List<DestinationResponse> destinations = destinationService.getMyDestinations(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("연동 채널 목록 조회 성공", destinations));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DestinationResponse>> createDestination(
            @CurrentUser CustomUserDetails userDetails,
            @Valid @RequestBody CreateDestinationRequest request) {
        DestinationResponse destination = destinationService.createDestination(userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("채널 등록 성공", destination));
    }

    @GetMapping("/{destinationId}")
    public ResponseEntity<ApiResponse<DestinationResponse>> getDestination(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String destinationId) {
        DestinationResponse destination = destinationService.getDestinationById(userDetails.getUserId(), destinationId);
        return ResponseEntity.ok(ApiResponse.success("채널 조회 성공", destination));
    }

    @PutMapping("/{destinationId}")
    public ResponseEntity<ApiResponse<DestinationResponse>> updateDestination(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String destinationId,
            @Valid @RequestBody UpdateDestinationRequest request) {
        DestinationResponse destination = destinationService.updateDestination(
                userDetails.getUserId(), destinationId, request);
        return ResponseEntity.ok(ApiResponse.success("채널 정보 수정 성공", destination));
    }

    @DeleteMapping("/{destinationId}")
    public ResponseEntity<ApiResponse<Void>> deleteDestination(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String destinationId) {
        destinationService.deleteDestination(userDetails.getUserId(), destinationId);
        return ResponseEntity.ok(ApiResponse.success("채널 연동 해제 성공"));
    }

    @PostMapping("/internal/batch")
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getDestinationsByIds(
            @RequestBody List<Long> ids) {
        List<DestinationResponse> destinations = destinationService.getDestinationsByIds(ids);
        return ResponseEntity.ok(ApiResponse.success("일괄 조회 성공", destinations));
    }

    /**
     * 내부 서비스용: 단일 destination 정보 조회 (토큰 포함)
     *
     * Media Service에서 채팅 연동 시 사용
     */
    @GetMapping("/{destinationId}/internal")
    public ResponseEntity<ApiResponse<DestinationInternalResponse>> getDestinationInternal(
            @PathVariable Long destinationId) {
        DestinationInternalResponse destination = destinationService.getDestinationByIdInternal(destinationId);
        return ResponseEntity.ok(ApiResponse.success("내부 조회 성공", destination));
    }
}
