package com.onetake.media.publish;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.publish.dto.PublishStartRequest;
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

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
@DisplayName("송출(Publish) API 통합 테스트")
class PublishApiTest {

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
    @DisplayName("송출 시작 - 성공")
    void startPublish_Success() throws Exception {
        // given
        PublishStartRequest request = PublishStartRequest.builder()
                .studioId(testStudioId)
                .destinationIds(List.of(1L, 2L))
                .build();

        // when & then
        mockMvc.perform(post("/api/v1/media/publish")
                        .header("X-User-Id", testUserId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studioId").value(testStudioId))
                .andExpect(jsonPath("$.data.status").value("PUBLISHING"));
    }

    @Test
    @DisplayName("송출 시작 - 활성 스트림 세션 없음")
    void startPublish_NoActiveStream() throws Exception {
        // given
        Long noStreamStudioId = 999L;
        PublishStartRequest request = PublishStartRequest.builder()
                .studioId(noStreamStudioId)
                .destinationIds(List.of(1L))
                .build();

        // when & then
        mockMvc.perform(post("/api/v1/media/publish")
                        .header("X-User-Id", testUserId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("S001")); // STREAM_SESSION_NOT_FOUND
    }

    @Test
    @DisplayName("송출 중지 - 성공")
    void stopPublish_Success() throws Exception {
        // given - 먼저 송출 시작
        PublishStartRequest startRequest = PublishStartRequest.builder()
                .studioId(testStudioId)
                .destinationIds(List.of(1L))
                .build();

        mockMvc.perform(post("/api/v1/media/publish")
                .header("X-User-Id", testUserId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(startRequest)));

        // when & then - 송출 중지
        mockMvc.perform(post("/api/v1/media/publish/stop")
                        .param("studioId", testStudioId.toString()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("STOPPED"));
    }

    @Test
    @DisplayName("송출 상태 조회 - 성공")
    void getPublishStatus_Success() throws Exception {
        // given - 송출 시작
        PublishStartRequest startRequest = PublishStartRequest.builder()
                .studioId(testStudioId)
                .destinationIds(List.of(1L))
                .build();

        mockMvc.perform(post("/api/v1/media/publish")
                .header("X-User-Id", testUserId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(startRequest)));

        // when & then - 상태 조회
        mockMvc.perform(get("/api/v1/media/publish/status")
                        .param("studioId", testStudioId.toString()))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studioId").value(testStudioId))
                .andExpect(jsonPath("$.data.status").value("PUBLISHING"));
    }
}
