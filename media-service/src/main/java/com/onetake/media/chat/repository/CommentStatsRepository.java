package com.onetake.media.chat.repository;

import com.onetake.media.chat.entity.CommentStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommentStatsRepository extends JpaRepository<CommentStats, Long> {

    /**
     * 녹화 ID로 댓글 통계 조회
     */
    Optional<CommentStats> findByRecordingId(Long recordingId);

    /**
     * 스튜디오 ID로 최근 댓글 통계 조회
     */
    Optional<CommentStats> findFirstByStudioIdOrderByCreatedAtDesc(Long studioId);

    /**
     * 녹화 ID로 존재 여부 확인
     */
    boolean existsByRecordingId(Long recordingId);
}
