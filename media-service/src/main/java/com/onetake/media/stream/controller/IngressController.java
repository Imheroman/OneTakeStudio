package com.onetake.media.stream.controller;

import com.onetake.media.global.common.ApiResponse;
import com.onetake.media.stream.dto.IngressCreateRequest;
import com.onetake.media.stream.dto.IngressResponse;
import com.onetake.media.stream.service.LiveKitIngressService;
import jakarta.validation.Valid;
import livekit.LivekitIngress.IngressInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Ingress 관리 Controller
 * OBS 등 외부 소스에서 RTMP/WHIP으로 스트리밍 입력 받기
 */
@Slf4j
@RestController
@RequestMapping("/api/media/ingress")
@RequiredArgsConstructor
public class IngressController {

    private final LiveKitIngressService ingressService;

    /**
     * RTMP Ingress 생성
     * OBS에서 사용할 RTMP URL과 Stream Key 발급
     */
    @PostMapping("/rtmp")
    public ResponseEntity<ApiResponse<IngressResponse>> createRtmpIngress(
            @Valid @RequestBody IngressCreateRequest request) {

        log.info("RTMP Ingress 생성 요청: room={}", request.getRoomName());

        IngressInfo ingressInfo = ingressService.createRtmpIngress(
                request.getRoomName(),
                request.getParticipantIdentity(),
                request.getParticipantName()
        );

        IngressResponse response = IngressResponse.from(ingressInfo);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * WHIP Ingress 생성
     * WebRTC HTTP Ingress
     */
    @PostMapping("/whip")
    public ResponseEntity<ApiResponse<IngressResponse>> createWhipIngress(
            @Valid @RequestBody IngressCreateRequest request) {

        log.info("WHIP Ingress 생성 요청: room={}", request.getRoomName());

        IngressInfo ingressInfo = ingressService.createWhipIngress(
                request.getRoomName(),
                request.getParticipantIdentity(),
                request.getParticipantName()
        );

        IngressResponse response = IngressResponse.from(ingressInfo);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Ingress 목록 조회
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<IngressResponse>>> listIngress(
            @RequestParam(required = false) String roomName) {

        log.info("Ingress 목록 조회: room={}", roomName);

        List<IngressInfo> ingressList = ingressService.listIngress(roomName);
        List<IngressResponse> response = ingressList.stream()
                .map(IngressResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Ingress 삭제
     */
    @DeleteMapping("/{ingressId}")
    public ResponseEntity<ApiResponse<Void>> deleteIngress(@PathVariable String ingressId) {

        log.info("Ingress 삭제 요청: ingressId={}", ingressId);

        ingressService.deleteIngress(ingressId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
