package com.onetake.media.recording;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.recording.dto.RecordingStartRequest;
import com.onetake.media.stream.entity.SessionStatus;
import com.onetake.media.stream.entity.StreamSession;
import com.onetake.media.stream.repository.StreamSessionRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
@DisplayName("녹화(Recording) API 통합 테스트")
class RecordingApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StreamSessionRepository streamSessionRepository;

    private Long testStudioId = 1L;
    private Long testUserId = 100L;

    @BeforeEach
    void setUp() {
        // 테스트용 활성 스트림 세션 생성
        StreamSession streamSession = StreamSession.builder()
                .studioId(testStudioId)
                .userId(testUserId)
                .roomName("test-room-" + testStudioId)
                .status(SessionStatus.ACTIVE)
                .build();
        streamSessionRepository.save(streamSession);
    }

    @Test
    @DisplayName("녹화 시작 - 성공")
    void startRecording_Success() throws Exception {
        // given
        RecordingStartRequest request = RecordingStartRequest.builder()
                .studioId(testStudioId)
                .outputFormat("mp4")
                .quality("1080p")
                .build();

        // when & then
        mockMvc.perform(post("/api/v1/media/record/start")
                        .header("X-User-Id", testUserId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studioId").value(testStudioId))
                .andExpect(jsonPath("$.data.status").value("RECORDING"));
    }

    @Test
    @DisplayName("녹화 일시정지 - 성공")
    void pauseRecording_Success() throws Exception {
        // given - 먼저 녹화 시작
        RecordingStartRequest startRequest = RecordingStartRequest.builder()
                .studioId(testStudioId)
                .outputFormat("mp4")
                .build();

        mockMvc.perform(post("/api/v1/media/record/start")
                .header("X-User-Id", testUserId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(startRequest)));

        // when & then - 일시정지
        mockMvc.perform(post("/api/v1/media/record/{studioId}/pause", testStudioId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PAUSED"));
    }

    @Test
    @DisplayName("녹화 재개 - 성공")
    void resumeRecording_Success() throws Exception {
        // given - 녹화 시작 후 일시정지
        RecordingStartRequest startRequest = RecordingStartRequest.builder()
                .studioId(testStudioId)
                .build();

        mockMvc.perform(post("/api/v1/media/record/start")
                .header("X-User-Id", testUserId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(startRequest)));

        mockMvc.perform(post("/api/v1/media/record/{studioId}/pause", testStudioId));

        // when & then - 재개
        mockMvc.perform(post("/api/v1/media/record/{studioId}/resume", testStudioId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("RECORDING"));
    }

    @Test
    @DisplayName("녹화 중지 - 성공")
    void stopRecording_Success() throws Exception {
        // given - 녹화 시작
        RecordingStartRequest startRequest = RecordingStartRequest.builder()
                .studioId(testStudioId)
                .build();

        mockMvc.perform(post("/api/v1/media/record/start")
                .header("X-User-Id", testUserId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(startRequest)));

        // when & then - 중지
        mockMvc.perform(post("/api/v1/media/record/{studioId}/stop", testStudioId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PROCESSING"));
    }
}
