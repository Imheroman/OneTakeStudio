package com.onetake.storage.upload.service;

import com.onetake.storage.upload.config.StorageConfig;
import com.onetake.storage.upload.dto.ChunkUploadResponse;
import com.onetake.storage.upload.dto.UploadCompleteResponse;
import com.onetake.storage.upload.dto.UploadInitRequest;
import com.onetake.storage.upload.dto.UploadInitResponse;
import com.onetake.storage.upload.entity.UploadSession;
import com.onetake.storage.upload.entity.UploadSessionStatus;
import com.onetake.storage.upload.repository.UploadSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
@DisplayName("ChunkStorageService 단위 테스트")
class ChunkStorageServiceTest {

    @Autowired
    private ChunkStorageService chunkStorageService;

    @Autowired
    private UploadSessionRepository uploadSessionRepository;

    @Autowired
    private StorageConfig storageConfig;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        // 임시 디렉토리로 저장 경로 설정
        storageConfig.setBasePath(tempDir.resolve("files").toString());
        storageConfig.setChunkPath(tempDir.resolve("chunks").toString());
    }

    @Test
    @DisplayName("업로드 세션 초기화 - 성공")
    void initializeUpload_Success() {
        // given
        UploadInitRequest request = UploadInitRequest.builder()
                .fileName("test_video.mp4")
                .fileSize(104857600L) // 100MB
                .totalChunks(2)
                .recordingId(123L)
                .build();

        // when
        UploadInitResponse response = chunkStorageService.initializeUpload(request);

        // then
        assertThat(response).isNotNull();
        assertThat(response.getUploadId()).isNotNull();
        assertThat(response.getUploadId()).hasSize(36); // UUID 형식

        // DB 저장 확인
        UploadSession session = uploadSessionRepository.findByUploadId(response.getUploadId()).orElse(null);
        assertThat(session).isNotNull();
        assertThat(session.getFileName()).isEqualTo("test_video.mp4");
        assertThat(session.getFileSize()).isEqualTo(104857600L);
        assertThat(session.getTotalChunks()).isEqualTo(2);
        assertThat(session.getUploadedChunks()).isEqualTo(0);
        assertThat(session.getStatus()).isEqualTo(UploadSessionStatus.INITIALIZED);
    }

    @Test
    @DisplayName("청크 저장 - 성공")
    void saveChunk_Success() {
        // given
        UploadInitRequest initRequest = UploadInitRequest.builder()
                .fileName("test_video.mp4")
                .fileSize(2048L)
                .totalChunks(2)
                .build();
        UploadInitResponse initResponse = chunkStorageService.initializeUpload(initRequest);

        byte[] chunkData = new byte[1024];
        for (int i = 0; i < chunkData.length; i++) {
            chunkData[i] = (byte) (i % 256);
        }

        // when
        ChunkUploadResponse response = chunkStorageService.saveChunk(initResponse.getUploadId(), 0, chunkData);

        // then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getChunkIndex()).isEqualTo(0);
        assertThat(response.getUploadedChunks()).isEqualTo(1);
        assertThat(response.getTotalChunks()).isEqualTo(2);

        // DB 상태 확인
        UploadSession session = uploadSessionRepository.findByUploadId(initResponse.getUploadId()).orElse(null);
        assertThat(session).isNotNull();
        assertThat(session.getUploadedChunks()).isEqualTo(1);
        assertThat(session.getStatus()).isEqualTo(UploadSessionStatus.UPLOADING);
    }

    @Test
    @DisplayName("모든 청크 업로드 후 완료 - 성공")
    void completeUpload_Success() {
        // given
        UploadInitRequest initRequest = UploadInitRequest.builder()
                .fileName("test_complete.mp4")
                .fileSize(2048L)
                .totalChunks(2)
                .build();
        UploadInitResponse initResponse = chunkStorageService.initializeUpload(initRequest);

        // 청크 2개 업로드
        byte[] chunk1 = "Hello ".getBytes();
        byte[] chunk2 = "World!".getBytes();
        chunkStorageService.saveChunk(initResponse.getUploadId(), 0, chunk1);
        chunkStorageService.saveChunk(initResponse.getUploadId(), 1, chunk2);

        // when
        UploadCompleteResponse response = chunkStorageService.completeUpload(initResponse.getUploadId());

        // then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getFileUrl()).contains("test_complete.mp4");

        // DB 상태 확인
        UploadSession session = uploadSessionRepository.findByUploadId(initResponse.getUploadId()).orElse(null);
        assertThat(session).isNotNull();
        assertThat(session.getStatus()).isEqualTo(UploadSessionStatus.COMPLETED);
        assertThat(session.getFinalFilePath()).isNotNull();
    }

    @Test
    @DisplayName("청크 미완료 상태에서 완료 요청 - 실패")
    void completeUpload_NotAllChunksUploaded_Fail() {
        // given
        UploadInitRequest initRequest = UploadInitRequest.builder()
                .fileName("incomplete.mp4")
                .fileSize(3072L)
                .totalChunks(3)
                .build();
        UploadInitResponse initResponse = chunkStorageService.initializeUpload(initRequest);

        // 청크 1개만 업로드
        chunkStorageService.saveChunk(initResponse.getUploadId(), 0, new byte[1024]);

        // when
        UploadCompleteResponse response = chunkStorageService.completeUpload(initResponse.getUploadId());

        // then
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getMessage()).contains("Not all chunks uploaded");
    }

    @Test
    @DisplayName("존재하지 않는 세션에 청크 저장 - 예외 발생")
    void saveChunk_SessionNotFound_ThrowsException() {
        // given
        String invalidUploadId = "non-existent-upload-id";

        // when & then
        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            chunkStorageService.saveChunk(invalidUploadId, 0, new byte[100]);
        });
    }
}
