package com.onetake.media.shorts;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.recording.entity.RecordingSession;
import com.onetake.media.recording.entity.RecordingStatus;
import com.onetake.media.recording.repository.RecordingSessionRepository;
import com.onetake.media.shorts.dto.AiCallbackRequest;
import com.onetake.media.shorts.dto.ShortsCreateRequest;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
@DisplayName("AI 숏츠 API 통합 테스트")
class ShortsApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RecordingSessionRepository recordingSessionRepository;

    @Autowired
    private ShortsJobRepository shortsJobRepository;

    private Long testUserId = 100L;
    private Long testStudioId = 1L;
    private Long testRecordingId;
    private String testJobId = "job_test_123";

    @BeforeEach
    void setUp() {
        // 테스트용 녹화 세션 생성
        RecordingSession recording = RecordingSession.builder()
                .studioId(testStudioId)
                .userId(testUserId)
                .status(RecordingStatus.COMPLETED)
                .filePath("/recordings/test-video.mp4")
                .build();
        RecordingSession savedRecording = recordingSessionRepository.save(recording);
        testRecordingId = savedRecording.getId();
    }

    @Test
    @DisplayName("숏츠 생성 요청 - 성공")
    void createShorts_Success() throws Exception {
        ShortsCreateRequest request = ShortsCreateRequest.builder()
                .recordingId(testRecordingId)
                .needSubtitles(true)
                .subtitleLang("ko")
                .build();

        mockMvc.perform(post("/api/shorts")
                        .header("X-User-Id", testUserId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.recordingId").value(testRecordingId))
                .andExpect(jsonPath("$.status").exists());
    }

    @Test
    @DisplayName("작업 상태 조회 - 성공")
    void getJob_Success() throws Exception {
        // given - 테스트 작업 생성
        ShortsJob job = ShortsJob.builder()
                .jobId(testJobId)
                .recordingId(testRecordingId)
                .studioId(testStudioId)
                .userId(testUserId)
                .status(ShortsStatus.PROCESSING)
                .videoPath("/recordings/test-video.mp4")
                .build();
        shortsJobRepository.save(job);

        // when & then
        mockMvc.perform(get("/api/shorts/{jobId}", testJobId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(testJobId))
                .andExpect(jsonPath("$.status").value("PROCESSING"));
    }

    @Test
    @DisplayName("작업 상태 조회 - 존재하지 않는 작업")
    void getJob_NotFound() throws Exception {
        mockMvc.perform(get("/api/shorts/{jobId}", "non-existent-job"))
                .andDo(print())
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("녹화별 작업 목록 조회 - 성공")
    void getJobsByRecording_Success() throws Exception {
        // given - 테스트 작업 생성
        ShortsJob job = ShortsJob.builder()
                .jobId(testJobId)
                .recordingId(testRecordingId)
                .studioId(testStudioId)
                .userId(testUserId)
                .status(ShortsStatus.COMPLETED)
                .videoPath("/recordings/test-video.mp4")
                .build();
        shortsJobRepository.save(job);

        // when & then
        mockMvc.perform(get("/api/shorts/recordings/{recordingId}", testRecordingId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].jobId").value(testJobId));
    }

    @Test
    @DisplayName("스튜디오별 작업 목록 조회 - 성공")
    void getJobsByStudio_Success() throws Exception {
        // given
        ShortsJob job = ShortsJob.builder()
                .jobId(testJobId)
                .recordingId(testRecordingId)
                .studioId(testStudioId)
                .userId(testUserId)
                .status(ShortsStatus.COMPLETED)
                .videoPath("/recordings/test-video.mp4")
                .build();
        shortsJobRepository.save(job);

        // when & then
        mockMvc.perform(get("/api/shorts/studios/{studioId}", testStudioId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("내 작업 목록 조회 - 성공")
    void getMyJobs_Success() throws Exception {
        // given
        ShortsJob job = ShortsJob.builder()
                .jobId(testJobId)
                .recordingId(testRecordingId)
                .studioId(testStudioId)
                .userId(testUserId)
                .status(ShortsStatus.COMPLETED)
                .videoPath("/recordings/test-video.mp4")
                .build();
        shortsJobRepository.save(job);

        // when & then
        mockMvc.perform(get("/api/shorts/my")
                        .header("X-User-Id", testUserId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
