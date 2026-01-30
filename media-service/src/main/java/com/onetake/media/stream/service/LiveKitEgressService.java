package com.onetake.media.stream.service;

import io.livekit.server.EgressServiceClient;
import io.livekit.server.EncodedOutputs;
import livekit.LivekitEgress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import retrofit2.Response;

import java.io.IOException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveKitEgressService {

    private final EgressServiceClient egressServiceClient;

    @Value("${livekit.egress.output-path:/data/recordings/}")
    private String outputPath;

    /**
     * Room Composite 녹화 시작
     *
     * @param roomName LiveKit room name
     * @param fileName 출력 파일명
     * @return egress ID
     */
    public String startRoomCompositeRecording(String roomName, String fileName) {
        try {
            log.info("Starting room composite recording: room={}, file={}", roomName, fileName);

            LivekitEgress.EncodedFileOutput fileOutput = LivekitEgress.EncodedFileOutput.newBuilder()
                    .setFileType(LivekitEgress.EncodedFileType.MP4)
                    .setFilepath(buildFilePath(fileName))
                    .build();

            EncodedOutputs outputs = new EncodedOutputs(fileOutput, null, null, null);

            Response<LivekitEgress.EgressInfo> response = egressServiceClient
                    .startRoomCompositeEgress(roomName, outputs, "speaker")
                    .execute();

            if (!response.isSuccessful() || response.body() == null) {
                String errorMsg = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
                throw new RuntimeException("Failed to start recording: " + errorMsg);
            }

            String egressId = response.body().getEgressId();
            log.info("Room composite recording started: egressId={}", egressId);
            return egressId;

        } catch (IOException e) {
            log.error("Failed to start room composite recording: room={}", roomName, e);
            throw new RuntimeException("Failed to start recording: " + e.getMessage(), e);
        }
    }

    /**
     * RTMP 스트림 송출 시작
     *
     * @param roomName LiveKit room name
     * @param rtmpUrls RTMP URL 목록 (streamKey 포함)
     * @return egress ID
     */
    public String startRtmpStream(String roomName, List<String> rtmpUrls) {
        try {
            log.info("Starting RTMP stream: room={}, destinations={}", roomName, rtmpUrls.size());

            LivekitEgress.StreamOutput.Builder streamOutputBuilder = LivekitEgress.StreamOutput.newBuilder()
                    .setProtocol(LivekitEgress.StreamProtocol.RTMP);

            for (String rtmpUrl : rtmpUrls) {
                streamOutputBuilder.addUrls(rtmpUrl);
            }

            Response<LivekitEgress.EgressInfo> response = egressServiceClient
                    .startRoomCompositeEgress(roomName, streamOutputBuilder.build(), "speaker")
                    .execute();

            if (!response.isSuccessful() || response.body() == null) {
                String errorMsg = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
                throw new RuntimeException("Failed to start RTMP stream: " + errorMsg);
            }

            String egressId = response.body().getEgressId();
            log.info("RTMP stream started: egressId={}", egressId);
            return egressId;

        } catch (IOException e) {
            log.error("Failed to start RTMP stream: room={}", roomName, e);
            throw new RuntimeException("Failed to start RTMP stream: " + e.getMessage(), e);
        }
    }

    /**
     * Egress 중지
     *
     * @param egressId 중지할 egress ID
     */
    public void stopEgress(String egressId) {
        try {
            log.info("Stopping egress: egressId={}", egressId);

            Response<LivekitEgress.EgressInfo> response = egressServiceClient.stopEgress(egressId).execute();

            if (!response.isSuccessful()) {
                String errorMsg = response.errorBody() != null ? response.errorBody().string() : "Unknown error";
                log.warn("Failed to stop egress: {}", errorMsg);
            } else {
                log.info("Egress stopped: egressId={}", egressId);
            }

        } catch (IOException e) {
            log.error("Failed to stop egress: egressId={}", egressId, e);
            throw new RuntimeException("Failed to stop egress: " + e.getMessage(), e);
        }
    }

    /**
     * Egress 상태 조회
     *
     * @param egressId 조회할 egress ID
     * @return EgressInfo
     */
    public LivekitEgress.EgressInfo getEgressInfo(String egressId) {
        try {
            log.debug("Getting egress info: egressId={}", egressId);

            Response<List<LivekitEgress.EgressInfo>> response = egressServiceClient
                    .listEgress(null, egressId, true)
                    .execute();

            if (!response.isSuccessful() || response.body() == null || response.body().isEmpty()) {
                throw new RuntimeException("Egress not found: " + egressId);
            }

            return response.body().get(0);

        } catch (IOException e) {
            log.error("Failed to get egress info: egressId={}", egressId, e);
            throw new RuntimeException("Failed to get egress info: " + e.getMessage(), e);
        }
    }

    /**
     * Egress 상태 조회 (상태값만)
     *
     * @param egressId 조회할 egress ID
     * @return EgressStatus
     */
    public LivekitEgress.EgressStatus getEgressStatus(String egressId) {
        return getEgressInfo(egressId).getStatus();
    }

    private String buildFilePath(String fileName) {
        return outputPath + fileName;
    }
}
