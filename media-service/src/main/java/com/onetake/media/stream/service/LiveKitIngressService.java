package com.onetake.media.stream.service;

import io.livekit.server.IngressServiceClient;
import livekit.LivekitIngress;
import livekit.LivekitIngress.IngressInfo;
import livekit.LivekitIngress.IngressInput;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import retrofit2.Response;

import java.io.IOException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveKitIngressService {

    private final IngressServiceClient ingressServiceClient;

    /**
     * RTMP Ingress 생성
     * OBS 등에서 스트리밍할 수 있는 RTMP URL과 Stream Key 반환
     *
     * @param roomName 참여할 LiveKit 방 이름
     * @param participantIdentity 참가자 식별자
     * @param participantName 참가자 표시 이름
     * @return IngressInfo (RTMP URL, Stream Key 포함)
     */
    public IngressInfo createRtmpIngress(String roomName, String participantIdentity, String participantName) {
        try {
            log.info("Creating RTMP ingress: room={}, participant={}", roomName, participantIdentity);

            String name = "ingress-" + roomName + "-" + participantIdentity;

            Response<IngressInfo> response = ingressServiceClient.createIngress(
                    name,
                    roomName,
                    participantIdentity,
                    participantName != null ? participantName : participantIdentity,
                    IngressInput.RTMP_INPUT,
                    null,  // audioOptions
                    null,  // videoOptions
                    null,  // bypassTranscoding
                    null,  // enableTranscoding
                    null   // url
            ).execute();

            if (!response.isSuccessful() || response.body() == null) {
                String errorMsg = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
                throw new RuntimeException("Failed to create RTMP ingress: " + errorMsg);
            }

            IngressInfo ingressInfo = response.body();
            log.info("RTMP ingress created: ingressId={}, url={}, streamKey={}",
                    ingressInfo.getIngressId(),
                    ingressInfo.getUrl(),
                    ingressInfo.getStreamKey());

            return ingressInfo;

        } catch (IOException e) {
            log.error("Failed to create RTMP ingress: room={}", roomName, e);
            throw new RuntimeException("Failed to create RTMP ingress: " + e.getMessage(), e);
        }
    }

    /**
     * WHIP Ingress 생성 (WebRTC HTTP Ingress)
     *
     * @param roomName 참여할 LiveKit 방 이름
     * @param participantIdentity 참가자 식별자
     * @param participantName 참가자 표시 이름
     * @return IngressInfo
     */
    public IngressInfo createWhipIngress(String roomName, String participantIdentity, String participantName) {
        try {
            log.info("Creating WHIP ingress: room={}, participant={}", roomName, participantIdentity);

            String name = "whip-" + roomName + "-" + participantIdentity;

            Response<IngressInfo> response = ingressServiceClient.createIngress(
                    name,
                    roomName,
                    participantIdentity,
                    participantName != null ? participantName : participantIdentity,
                    IngressInput.WHIP_INPUT,
                    null,
                    null,
                    null,
                    null,
                    null
            ).execute();

            if (!response.isSuccessful() || response.body() == null) {
                String errorMsg = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
                throw new RuntimeException("Failed to create WHIP ingress: " + errorMsg);
            }

            IngressInfo ingressInfo = response.body();
            log.info("WHIP ingress created: ingressId={}", ingressInfo.getIngressId());

            return ingressInfo;

        } catch (IOException e) {
            log.error("Failed to create WHIP ingress: room={}", roomName, e);
            throw new RuntimeException("Failed to create WHIP ingress: " + e.getMessage(), e);
        }
    }

    /**
     * Ingress 목록 조회
     *
     * @param roomName 방 이름 (null이면 전체 조회)
     * @return Ingress 목록
     */
    public List<IngressInfo> listIngress(String roomName) {
        try {
            log.debug("Listing ingress: room={}", roomName);

            Response<List<IngressInfo>> response = ingressServiceClient
                    .listIngress(roomName, null)
                    .execute();

            if (!response.isSuccessful() || response.body() == null) {
                throw new RuntimeException("Failed to list ingress");
            }

            return response.body();

        } catch (IOException e) {
            log.error("Failed to list ingress", e);
            throw new RuntimeException("Failed to list ingress: " + e.getMessage(), e);
        }
    }

    /**
     * Ingress 삭제
     *
     * @param ingressId 삭제할 Ingress ID
     */
    public void deleteIngress(String ingressId) {
        try {
            log.info("Deleting ingress: ingressId={}", ingressId);

            Response<IngressInfo> response = ingressServiceClient.deleteIngress(ingressId).execute();

            if (!response.isSuccessful()) {
                String errorMsg = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
                log.warn("Failed to delete ingress: {}", errorMsg);
            } else {
                log.info("Ingress deleted: ingressId={}", ingressId);
            }

        } catch (IOException e) {
            log.error("Failed to delete ingress: ingressId={}", ingressId, e);
            throw new RuntimeException("Failed to delete ingress: " + e.getMessage(), e);
        }
    }
}
