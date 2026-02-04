package com.onetake.storage.upload.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.onetake.storage.upload.config.StorageConfig;
import com.onetake.storage.upload.dto.UploadInitRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ActiveProfiles("test")
@DisplayName("ChunkReceiveController API 테스트")
class ChunkReceiveControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StorageConfig storageConfig;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        storageConfig.setBasePath(tempDir.resolve("files").toString());
        storageConfig.setChunkPath(tempDir.resolve("chunks").toString());
    }

    @Test
    @DisplayName("POST /api/upload/init - 업로드 세션 초기화 성공")
    void initializeUpload_Success() throws Exception {
        // given
        UploadInitRequest request = UploadInitRequest.builder()
                .fileName("test_video.mp4")
                .fileSize(52428800L) // 50MB
                .totalChunks(1)
                .recordingId(123L)
                .build();

        // when & then
        mockMvc.perform(post("/api/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadId").exists())
                .andExpect(jsonPath("$.uploadId").isString())
                .andExpect(jsonPath("$.message").value("Upload session initialized successfully"));
    }

    @Test
    @DisplayName("POST /api/upload/init - 필수 파라미터 누락 시 400 에러")
    void initializeUpload_MissingParams_BadRequest() throws Exception {
        // given - fileName 누락
        String invalidRequest = "{\"fileSize\": 1024, \"totalChunks\": 1}";

        // when & then
        mockMvc.perform(post("/api/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidRequest))
                .andDo(print())
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/upload/chunk/{uploadId} - 청크 업로드 성공")
    void uploadChunk_Success() throws Exception {
        // given - 세션 초기화
        UploadInitRequest initRequest = UploadInitRequest.builder()
                .fileName("chunk_test.mp4")
                .fileSize(1024L)
                .totalChunks(1)
                .build();

        MvcResult initResult = mockMvc.perform(post("/api/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initRequest)))
                .andReturn();

        Map<String, Object> initResponse = objectMapper.readValue(
                initResult.getResponse().getContentAsString(), Map.class);
        String uploadId = (String) initResponse.get("uploadId");

        // when & then - 청크 업로드
        byte[] chunkData = new byte[1024];
        for (int i = 0; i < chunkData.length; i++) {
            chunkData[i] = (byte) i;
        }

        mockMvc.perform(post("/api/upload/chunk/{uploadId}", uploadId)
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .header("X-Chunk-Index", 0)
                        .content(chunkData))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.chunkIndex").value(0))
                .andExpect(jsonPath("$.uploadedChunks").value(1))
                .andExpect(jsonPath("$.totalChunks").value(1));
    }

    @Test
    @DisplayName("POST /api/upload/chunk/{uploadId} - 존재하지 않는 세션 시 500 에러")
    void uploadChunk_SessionNotFound_Error() throws Exception {
        // given
        String invalidUploadId = "non-existent-id";
        byte[] chunkData = new byte[100];

        // when & then
        mockMvc.perform(post("/api/upload/chunk/{uploadId}", invalidUploadId)
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .header("X-Chunk-Index", 0)
                        .content(chunkData))
                .andDo(print())
                .andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("POST /api/upload/complete/{uploadId} - 업로드 완료 및 병합 성공")
    void completeUpload_Success() throws Exception {
        // given - 세션 초기화 및 청크 업로드
        UploadInitRequest initRequest = UploadInitRequest.builder()
                .fileName("complete_test.mp4")
                .fileSize(2048L)
                .totalChunks(2)
                .build();

        MvcResult initResult = mockMvc.perform(post("/api/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initRequest)))
                .andReturn();

        Map<String, Object> initResponse = objectMapper.readValue(
                initResult.getResponse().getContentAsString(), Map.class);
        String uploadId = (String) initResponse.get("uploadId");

        // 청크 2개 업로드
        byte[] chunk1 = "First chunk data!".getBytes();
        byte[] chunk2 = "Second chunk data".getBytes();

        mockMvc.perform(post("/api/upload/chunk/{uploadId}", uploadId)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header("X-Chunk-Index", 0)
                .content(chunk1));

        mockMvc.perform(post("/api/upload/chunk/{uploadId}", uploadId)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header("X-Chunk-Index", 1)
                .content(chunk2));

        // when & then - 완료 요청
        mockMvc.perform(post("/api/upload/complete/{uploadId}", uploadId))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.fileUrl").exists())
                .andExpect(jsonPath("$.fileUrl").value(org.hamcrest.Matchers.containsString("complete_test.mp4")));
    }

    @Test
    @DisplayName("POST /api/upload/complete/{uploadId} - 청크 미완료 시 400 에러")
    void completeUpload_IncompleteChunks_BadRequest() throws Exception {
        // given - 세션 초기화만 하고 청크 업로드 안함
        UploadInitRequest initRequest = UploadInitRequest.builder()
                .fileName("incomplete.mp4")
                .fileSize(3072L)
                .totalChunks(3)
                .build();

        MvcResult initResult = mockMvc.perform(post("/api/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initRequest)))
                .andReturn();

        Map<String, Object> initResponse = objectMapper.readValue(
                initResult.getResponse().getContentAsString(), Map.class);
        String uploadId = (String) initResponse.get("uploadId");

        // when & then - 청크 없이 완료 요청
        mockMvc.perform(post("/api/upload/complete/{uploadId}", uploadId))
                .andDo(print())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Not all chunks")));
    }

    @Test
    @DisplayName("GET /api/upload/health - 헬스 체크")
    void healthCheck_Success() throws Exception {
        mockMvc.perform(get("/api/upload/health"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(content().string("OK"));
    }

    @Test
    @DisplayName("전체 업로드 플로우 - init → chunk → complete")
    void fullUploadFlow_Success() throws Exception {
        // 1. 초기화
        UploadInitRequest initRequest = UploadInitRequest.builder()
                .fileName("full_flow_test.mp4")
                .fileSize(1024L)
                .totalChunks(1)
                .recordingId(999L)
                .build();

        MvcResult initResult = mockMvc.perform(post("/api/upload/init")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String uploadId = (String) objectMapper.readValue(
                initResult.getResponse().getContentAsString(), Map.class).get("uploadId");

        // 2. 청크 업로드
        byte[] videoData = new byte[1024];
        for (int i = 0; i < videoData.length; i++) {
            videoData[i] = (byte) (i % 256);
        }

        mockMvc.perform(post("/api/upload/chunk/{uploadId}", uploadId)
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .header("X-Chunk-Index", 0)
                        .content(videoData))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. 완료
        mockMvc.perform(post("/api/upload/complete/{uploadId}", uploadId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.fileUrl").exists());
    }
}
