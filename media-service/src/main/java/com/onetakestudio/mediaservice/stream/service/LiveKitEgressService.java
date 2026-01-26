package com.onetakestudio.mediaservice.stream.service;

import io.livekit.server.EgressServiceClient;
import livekit.LivekitEgress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveKitEgressService {

    private final EgressServiceClient egressServiceClient;

    @Value("${livekit.egress.output-path:recordings/}")
    private String outputPath;

    @Value("${livekit.egress.s3-bucket:#{null}}")
    private String s3Bucket;

    @Value("${livekit.egress.s3-region:#{null}}")
    private String s3Region;

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

            LivekitEgress.RoomCompositeEgressRequest request = LivekitEgress.RoomCompositeEgressRequest.newBuilder()
                    .setRoomName(roomName)
                    .setFile(fileOutput)
                    .setLayout("speaker")
                    .setAudioOnly(false)
                    .setVideoOnly(false)
                    .build();

            LivekitEgress.EgressInfo egressInfo = egressServiceClient.startRoomCompositeEgress(request).get();
            String egressId = egressInfo.getEgressId();

            log.info("Room composite recording started: egressId={}", egressId);
            return egressId;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Recording start interrupted", e);
        } catch (ExecutionException e) {
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

            LivekitEgress.RoomCompositeEgressRequest request = LivekitEgress.RoomCompositeEgressRequest.newBuilder()
                    .setRoomName(roomName)
                    .setStream(streamOutputBuilder.build())
                    .setLayout("speaker")
                    .build();

            LivekitEgress.EgressInfo egressInfo = egressServiceClient.startRoomCompositeEgress(request).get();
            String egressId = egressInfo.getEgressId();

            log.info("RTMP stream started: egressId={}", egressId);
            return egressId;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("RTMP stream start interrupted", e);
        } catch (ExecutionException e) {
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

            egressServiceClient.stopEgress(egressId).get();

            log.info("Egress stopped: egressId={}", egressId);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Egress stop interrupted", e);
        } catch (ExecutionException e) {
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

            LivekitEgress.ListEgressRequest request = LivekitEgress.ListEgressRequest.newBuilder()
                    .setEgressId(egressId)
                    .build();

            List<LivekitEgress.EgressInfo> egressList = egressServiceClient.listEgress(request).get();

            if (egressList.isEmpty()) {
                throw new RuntimeException("Egress not found: " + egressId);
            }

            return egressList.get(0);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Egress info retrieval interrupted", e);
        } catch (ExecutionException e) {
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
        if (s3Bucket != null && !s3Bucket.isEmpty()) {
            return String.format("s3://%s/%s%s", s3Bucket, outputPath, fileName);
        }
        return outputPath + fileName;
    }
}
