package com.onetake.core.destination.controller;

import com.onetake.common.dto.ApiResponse;
import com.onetake.core.security.CurrentUser;
import com.onetake.core.security.CustomUserDetails;
import com.onetake.core.destination.dto.CreateDestinationRequest;
import com.onetake.core.destination.dto.DestinationResponse;
import com.onetake.core.destination.dto.UpdateDestinationRequest;
import com.onetake.core.destination.service.DestinationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/destinations")
@RequiredArgsConstructor
public class DestinationController {

    private final DestinationService destinationService;

    /**
     * W12: 내 연동 채널 목록 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getMyDestinations(
            @CurrentUser CustomUserDetails userDetails) {

        log.debug("연동 채널 목록 조회 요청: userId={}", userDetails.getUserId());
        List<DestinationResponse> destinations = destinationService.getMyDestinations(userDetails.getUserId());

        return ResponseEntity.ok(ApiResponse.success("연동 채널 목록 조회 성공", destinations));
    }

    /**
     * W13: 신규 송출 채널 등록
     */
    @PostMapping
    public ResponseEntity<ApiResponse<DestinationResponse>> createDestination(
            @CurrentUser CustomUserDetails userDetails,
            @Valid @RequestBody CreateDestinationRequest request) {

        log.debug("신규 채널 등록 요청: userId={}, platform={}", userDetails.getUserId(), request.getPlatform());
        DestinationResponse destination = destinationService.createDestination(userDetails.getUserId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("채널 등록 성공", destination));
    }

    /**
     * 단일 채널 조회
     */
    @GetMapping("/{destinationId}")
    public ResponseEntity<ApiResponse<DestinationResponse>> getDestination(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String destinationId) {

        log.debug("채널 조회 요청: destinationId={}", destinationId);
        DestinationResponse destination = destinationService.getDestinationById(userDetails.getUserId(), destinationId);

        return ResponseEntity.ok(ApiResponse.success("채널 조회 성공", destination));
    }

    /**
     * W14: 채널 정보 수정
     */
    @PutMapping("/{destinationId}")
    public ResponseEntity<ApiResponse<DestinationResponse>> updateDestination(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String destinationId,
            @Valid @RequestBody UpdateDestinationRequest request) {

        log.debug("채널 정보 수정 요청: destinationId={}", destinationId);
        DestinationResponse destination = destinationService.updateDestination(
                userDetails.getUserId(), destinationId, request);

        return ResponseEntity.ok(ApiResponse.success("채널 정보 수정 성공", destination));
    }

    /**
     * W14: 채널 연동 해제
     */
    @DeleteMapping("/{destinationId}")
    public ResponseEntity<ApiResponse<Void>> deleteDestination(
            @CurrentUser CustomUserDetails userDetails,
            @PathVariable String destinationId) {

        log.debug("채널 연동 해제 요청: destinationId={}", destinationId);
        destinationService.deleteDestination(userDetails.getUserId(), destinationId);

        return ResponseEntity.ok(ApiResponse.success("채널 연동 해제 성공"));
    }

    /**
     * 내부 서비스용: ID 목록으로 Destination 일괄 조회
     * media-service에서 송출 시 호출
     */
    @PostMapping("/internal/batch")
    public ResponseEntity<ApiResponse<List<DestinationResponse>>> getDestinationsByIds(
            @RequestBody List<Long> ids) {

        log.debug("Destination 일괄 조회 요청: ids={}", ids);
        List<DestinationResponse> destinations = destinationService.getDestinationsByIds(ids);

        return ResponseEntity.ok(ApiResponse.success("일괄 조회 성공", destinations));
    }
}
