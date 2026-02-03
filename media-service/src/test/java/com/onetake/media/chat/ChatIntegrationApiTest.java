package com.onetake.media.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.media.chat.entity.ChatPlatform;
import com.onetake.media.chat.integration.ChatIntegrationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
@DisplayName("채팅 연동 API 통합 테스트")
class ChatIntegrationApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ChatIntegrationService chatIntegrationService;

    private Long testStudioId = 1L;

    @Test
    @DisplayName("연동 상태 조회 - 성공")
    void getIntegrationStatus_Success() throws Exception {
        mockMvc.perform(get("/api/media/chat/integration/{studioId}/status", testStudioId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.studioId").value(testStudioId))
                .andExpect(jsonPath("$.data.platformStatus.YOUTUBE").exists())
                .andExpect(jsonPath("$.data.platformStatus.CHZZK").exists());
    }

    @Test
    @DisplayName("Chzzk 연동 시작 - 요청 형식 검증")
    void startChzzkIntegration_RequestFormat() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("channelId", "test-channel-id");

        mockMvc.perform(post("/api/media/chat/integration/{studioId}/chzzk/start", testStudioId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("YouTube 연동 시작 - 요청 형식 검증")
    void startYouTubeIntegration_RequestFormat() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("accessToken", "test-access-token");
        request.put("refreshToken", "test-refresh-token");
        request.put("liveChatId", "test-live-chat-id");

        mockMvc.perform(post("/api/media/chat/integration/{studioId}/youtube/start", testStudioId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("연동 종료 - 성공")
    void stopIntegration_Success() throws Exception {
        mockMvc.perform(post("/api/media/chat/integration/{studioId}/{platform}/stop",
                        testStudioId, ChatPlatform.YOUTUBE))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("모든 연동 종료 - 성공")
    void stopAllIntegrations_Success() throws Exception {
        mockMvc.perform(post("/api/media/chat/integration/{studioId}/stop-all", testStudioId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
