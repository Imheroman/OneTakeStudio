package com.onetake.core.destination.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.destination.dto.CreateDestinationRequest;
import com.onetake.core.destination.dto.DestinationResponse;
import com.onetake.core.destination.dto.UpdateDestinationRequest;
import com.onetake.core.destination.service.DestinationService;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/destinations")
@RequiredArgsConstructor
public class DestinationController {

    private final DestinationService destinationService;

    @PostMapping
    public ResponseEntity<ApiResponse<DestinationResponse>> createDestination(
            @CurrentUser CustomUserDetails userDetails,
            @RequestBody @Valid CreateDestinationRequest request) {
        DestinationResponse response = destinationService.createDestination(userDetails.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("송출 채널 등록 성공", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getMyDestinations(
            @CurrentUser CustomUserDetails userDetails) {
        List<DestinationResponse> response = destinationService.getMyDestinations(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success("송출 채널 목록 조회 성공", response));
    }

    @PutMapping("/{destinationId}")
    public ResponseEntity<ApiResponse<DestinationResponse>> updateDestination(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String destinationId,
            @RequestBody @Valid UpdateDestinationRequest request) {
        DestinationResponse response = destinationService.updateDestination(
                userDetails.getUserId(), destinationId, request);
        return ResponseEntity.ok(ApiResponse.success("송출 채널 수정 성공", response));
    }

    @DeleteMapping("/{destinationId}")
    public ResponseEntity<ApiResponse<Void>> deleteDestination(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String destinationId) {
        destinationService.deleteDestination(userDetails.getUserId(), destinationId);
        return ResponseEntity.ok(ApiResponse.success("송출 채널 삭제 성공"));
    }
}
