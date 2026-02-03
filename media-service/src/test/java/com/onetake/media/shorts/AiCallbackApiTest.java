package com.onetake.media.shorts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.shorts.dto.AiCallbackRequest;
import com.onetake.media.shorts.entity.ShortsJob;
import com.onetake.media.shorts.entity.ShortsStatus;
import com.onetake.media.shorts.repository.ShortsJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
@DisplayName("AI 콜백 API 통합 테스트")
class AiCallbackApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ShortsJobRepository shortsJobRepository;

    private String testJobId = "job_callback_test_123";
    private Long testRecordingId = 1L;
    private Long testStudioId = 1L;
    private Long testUserId = 100L;

    @BeforeEach
    void setUp() {
        // 테스트용 작업 생성
        ShortsJob job = ShortsJob.builder()
                .jobId(testJobId)
                .recordingId(testRecordingId)
                .studioId(testStudioId)
                .userId(testUserId)
                .status(ShortsStatus.PROCESSING)
                .videoPath("/recordings/test-video.mp4")
                .build();
        shortsJobRepository.save(job);
    }

    @Test
    @DisplayName("AI 콜백 - 성공 처리")
    void handleAiCallback_Success() throws Exception {
        AiCallbackRequest request = AiCallbackRequest.builder()
                .jobId(testJobId)
                .videoId(String.valueOf(testRecordingId))
                .status("success")
                .data(AiCallbackRequest.ResultData.builder()
                        .shortInfo(AiCallbackRequest.ShortInfo.builder()
                                .filePath("/output/shorts/test-short.mp4")
                                .durationSec(45.5)
                                .hasSubtitles(true)
                                .build())
                        .highlight(AiCallbackRequest.HighlightInfo.builder()
                                .startSec(120.0)
                                .endSec(165.5)
                                .reason("높은 댓글 반응 구간")
                                .build())
                        .titles(List.of(
                                "하이라이트 모음",
                                "베스트 장면",
                                "명장면 클립"
                        ))
                        .build())
                .build();

        mockMvc.perform(post("/api/callback/ai-result")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("received"))
                .andExpect(jsonPath("$.jobId").value(testJobId));

        // DB 상태 확인
        ShortsJob updatedJob = shortsJobRepository.findByJobId(testJobId).orElseThrow();
        assertThat(updatedJob.getStatus()).isEqualTo(ShortsStatus.COMPLETED);
        assertThat(updatedJob.getOutputPath()).isEqualTo("/output/shorts/test-short.mp4");
    }

    @Test
    @DisplayName("AI 콜백 - 실패 처리")
    void handleAiCallback_Failure() throws Exception {
        AiCallbackRequest request = AiCallbackRequest.builder()
                .jobId(testJobId)
                .videoId(String.valueOf(testRecordingId))
                .status("failed")
                .error("Video processing failed: insufficient memory")
                .build();

        mockMvc.perform(post("/api/callback/ai-result")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("received"))
                .andExpect(jsonPath("$.jobId").value(testJobId));

        // DB 상태 확인
        ShortsJob updatedJob = shortsJobRepository.findByJobId(testJobId).orElseThrow();
        assertThat(updatedJob.getStatus()).isEqualTo(ShortsStatus.FAILED);
        assertThat(updatedJob.getErrorMessage()).contains("insufficient memory");
    }

    @Test
    @DisplayName("AI 콜백 - 존재하지 않는 작업")
    void handleAiCallback_JobNotFound() throws Exception {
        AiCallbackRequest request = AiCallbackRequest.builder()
                .jobId("non-existent-job")
                .videoId("123")
                .status("success")
                .build();

        mockMvc.perform(post("/api/callback/ai-result")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("error"));
    }
}
