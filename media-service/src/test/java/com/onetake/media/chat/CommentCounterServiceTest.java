package com.onetake.media.chat;

import com.onetake.media.chat.service.CommentCounterService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("CommentCounterService 단위 테스트")
class CommentCounterServiceTest {

    @Autowired
    private CommentCounterService commentCounterService;

    @Test
    @DisplayName("카운터 시작 - 성공")
    void startCounting_Success() {
        // given
        String studioId = "100";

        // when
        commentCounterService.startCounting(studioId);

        // then
        assertThat(commentCounterService.isCountingActive(studioId)).isTrue();

        // cleanup
        commentCounterService.stopCounting(studioId);
    }

    @Test
    @DisplayName("카운트 증가 - 성공")
    void incrementCount_Success() {
        // given
        String studioId = "101";
        commentCounterService.startCounting(studioId);

        // when
        commentCounterService.incrementCount(studioId);
        commentCounterService.incrementCount(studioId);
        commentCounterService.incrementCount(studioId);

        // then
        List<Integer> counts = commentCounterService.getCurrentCounts(studioId);
        assertThat(counts).isNotEmpty();
        assertThat(counts.get(0)).isEqualTo(3);

        // cleanup
        commentCounterService.stopCounting(studioId);
    }

    @Test
    @DisplayName("카운터 중지 - 성공")
    void stopCounting_Success() {
        // given
        String studioId = "102";
        commentCounterService.startCounting(studioId);

        // when
        commentCounterService.stopCounting(studioId);

        // then
        assertThat(commentCounterService.isCountingActive(studioId)).isFalse();
    }

    @Test
    @DisplayName("카운터가 없을 때 incrementCount 호출 - 자동 시작")
    void incrementCount_AutoStart() {
        // given
        String studioId = "103";

        // when
        commentCounterService.incrementCount(studioId);

        // then
        assertThat(commentCounterService.isCountingActive(studioId)).isTrue();
        List<Integer> counts = commentCounterService.getCurrentCounts(studioId);
        assertThat(counts.get(0)).isEqualTo(1);

        // cleanup
        commentCounterService.stopCounting(studioId);
    }

    @Test
    @DisplayName("비활성 카운터의 카운트 조회 - 빈 리스트 반환")
    void getCurrentCounts_InactiveCounter() {
        // given
        String studioId = "104";

        // when
        List<Integer> counts = commentCounterService.getCurrentCounts(studioId);

        // then
        assertThat(counts).isEmpty();
    }
}
