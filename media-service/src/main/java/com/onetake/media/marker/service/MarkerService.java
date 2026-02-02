package com.onetake.media.marker.service;

import com.onetake.media.marker.dto.CreateMarkerRequest;
import com.onetake.media.marker.dto.MarkerResponse;
import com.onetake.media.marker.entity.Marker;
import com.onetake.media.marker.entity.MarkerSource;
import com.onetake.media.marker.repository.MarkerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MarkerService {

    private final MarkerRepository markerRepository;

    /**
     * 수동 마커 생성 (사용자가 버튼 클릭)
     */
    @Transactional
    public MarkerResponse createManualMarker(Long userId, CreateMarkerRequest request) {
        log.info("수동 마커 생성: studioId={}, timestamp={}", request.getStudioId(), request.getTimestampSec());

        Marker marker = Marker.builder()
                .studioId(request.getStudioId())
                .recordingId(request.getRecordingId())
                .userId(userId)
                .timestampSec(request.getTimestampSec())
                .source(MarkerSource.MANUAL)
                .label(request.getLabel())
                .build();

        Marker saved = markerRepository.save(marker);
        return MarkerResponse.from(saved);
    }

    /**
     * 채팅 급증으로 자동 마커 생성
     */
    @Transactional
    public MarkerResponse createChatSpikeMarker(Long studioId, String recordingId,
                                                 Double timestampSec, Double spikeRatio) {
        log.info("채팅 급증 마커 생성: studioId={}, timestamp={}, spikeRatio={}",
                studioId, timestampSec, spikeRatio);

        Marker marker = Marker.builder()
                .studioId(studioId)
                .recordingId(recordingId)
                .timestampSec(timestampSec)
                .source(MarkerSource.CHAT_SPIKE)
                .label("채팅 급증 (x" + String.format("%.1f", spikeRatio) + ")")
                .chatSpikeRatio(spikeRatio)
                .build();

        Marker saved = markerRepository.save(marker);
        return MarkerResponse.from(saved);
    }

    /**
     * 스튜디오의 마커 목록 조회
     */
    @Transactional(readOnly = true)
    public List<MarkerResponse> getMarkersByStudio(Long studioId) {
        return markerRepository.findByStudioIdOrderByTimestampSecAsc(studioId)
                .stream()
                .map(MarkerResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 녹화의 마커 목록 조회
     */
    @Transactional(readOnly = true)
    public List<MarkerResponse> getMarkersByRecording(String recordingId) {
        return markerRepository.findByRecordingIdOrderByTimestampSecAsc(recordingId)
                .stream()
                .map(MarkerResponse::from)
                .collect(Collectors.toList());
    }

    /**
     * 쇼츠 생성용 상위 마커 조회 (채팅 급증률 높은 순)
     */
    @Transactional(readOnly = true)
    public List<Marker> getTopMarkersForShorts(String recordingId, int limit) {
        List<Marker> markers = markerRepository.findTopUnusedMarkers(recordingId);
        return markers.stream().limit(limit).collect(Collectors.toList());
    }

    /**
     * 마커를 쇼츠 생성에 사용됨으로 표시
     */
    @Transactional
    public void markAsUsedForShorts(List<String> markerIds) {
        for (String markerId : markerIds) {
            markerRepository.findByMarkerId(markerId).ifPresent(marker -> {
                marker.setUsedForShorts(true);
                markerRepository.save(marker);
            });
        }
    }

    /**
     * 마커 삭제
     */
    @Transactional
    public void deleteMarker(String markerId) {
        markerRepository.findByMarkerId(markerId).ifPresent(markerRepository::delete);
    }
}
