package com.onetake.media.chat.controller;

import com.onetake.media.chat.dto.CommentCountsResponse;
import com.onetake.media.chat.entity.CommentStats;
import com.onetake.media.chat.repository.CommentStatsRepository;
import com.onetake.media.chat.service.CommentCounterService;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.global.resolver.StudioIdResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 분당 댓글 수 통계 API
 *
 * - 라이브러리 그래프 시각화용 조회
 * - 실시간 카운터 상태 모니터링 (디버깅용)
 */
@Slf4j
@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class CommentStatsController {

    private final CommentStatsRepository commentStatsRepository;
    private final CommentCounterService commentCounterService;
    private final StudioIdResolver studioIdResolver;

    /**
     * 녹화별 분당 댓글 수 조회
     * 라이브러리 그래프 시각화에 사용
     *
     * GET /api/media/recordings/{recordingId}/comment-counts
     */
    @GetMapping("/recordings/{recordingId}/comment-counts")
    public ResponseEntity<CommentCountsResponse> getCommentCounts(
            @PathVariable Long recordingId) {

        CommentStats stats = commentStatsRepository.findByRecordingId(recordingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        return ResponseEntity.ok(CommentCountsResponse.from(stats));
    }

    /**
     * 스튜디오별 최근 댓글 통계 조회
     *
     * GET /api/media/studios/{studioId}/comment-counts
     */
    @GetMapping("/studios/{studioId}/comment-counts")
    public ResponseEntity<CommentCountsResponse> getCommentCountsByStudio(
            @PathVariable String studioId) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        CommentStats stats = commentStatsRepository.findFirstByStudioIdOrderByCreatedAtDesc(resolvedStudioId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        return ResponseEntity.ok(CommentCountsResponse.from(stats));
    }

    /**
     * 현재 진행 중인 카운터 상태 조회 (디버깅/모니터링용)
     *
     * GET /api/media/studios/{studioId}/comment-counts/live
     */
    @GetMapping("/studios/{studioId}/comment-counts/live")
    public ResponseEntity<Map<String, Object>> getLiveCommentCounts(
            @PathVariable String studioId) {

        Long resolvedStudioId = studioIdResolver.resolveStudioId(studioId);
        boolean isActive = commentCounterService.isCountingActive(resolvedStudioId);
        List<Integer> counts = commentCounterService.getCurrentCounts(resolvedStudioId);
        int totalCount = counts.stream().mapToInt(Integer::intValue).sum();

        return ResponseEntity.ok(Map.of(
                "studioId", resolvedStudioId,
                "isActive", isActive,
                "currentMinute", counts.size(),
                "counts", counts,
                "totalCount", totalCount
        ));
    }
}
