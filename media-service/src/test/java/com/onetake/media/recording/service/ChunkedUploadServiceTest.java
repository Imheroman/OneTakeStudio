//package com.onetake.media.recording.service;
//
//import com.onetake.media.recording.config.ExternalUploadConfig;
//import com.onetake.media.recording.entity.RecordingSession;
//import com.onetake.media.recording.entity.RecordingStatus;
//import com.onetake.media.recording.entity.UploadStatus;
//import com.onetake.media.recording.repository.RecordingSessionRepository;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.DisplayName;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.junit.jupiter.api.io.TempDir;
//import org.mockito.InjectMocks;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//import org.springframework.http.HttpEntity;
//import org.springframework.http.HttpMethod;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.client.RestTemplate;
//
//import java.io.IOException;
//import java.nio.file.Files;
//import java.nio.file.Path;
//import java.util.HashMap;
//import java.util.Map;
//import java.util.Optional;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.mockito.ArgumentMatchers.*;
//import static org.mockito.Mockito.*;
//
//@ExtendWith(MockitoExtension.class)
//@DisplayName("ChunkedUploadService 단위 테스트")
//class ChunkedUploadServiceTest {
//
//    @Mock
//    private ExternalUploadConfig uploadConfig;
//
//    @Mock
//    private RestTemplate restTemplate;
//
//    @Mock
//    private RecordingSessionRepository recordingSessionRepository;
//
//    @InjectMocks
//    private ChunkedUploadService chunkedUploadService;
//
//    @TempDir
//    Path tempDir;
//
//    private Path testFilePath;
//
//    @BeforeEach
//    void setUp() throws IOException {
//        // 테스트 파일 생성 (1KB)
//        testFilePath = tempDir.resolve("test_video.mp4");
//        byte[] testData = new byte[1024];
//        for (int i = 0; i < testData.length; i++) {
//            testData[i] = (byte) (i % 256);
//        }
//        Files.write(testFilePath, testData);
//    }
//
//    @Test
//    @DisplayName("isUploadEnabled - 업로드 활성화 상태 확인")
//    void isUploadEnabled_ReturnsConfigValue() {
//        // given
//        when(uploadConfig.isEnabled()).thenReturn(true);
//
//        // when
//        boolean result = chunkedUploadService.isUploadEnabled();
//
//        // then
//        assertThat(result).isTrue();
//        verify(uploadConfig).isEnabled();
//    }
//
//    @Test
//    @DisplayName("isUploadEnabled - 업로드 비활성화 상태 확인")
//    void isUploadEnabled_ReturnsFalse() {
//        // given
//        when(uploadConfig.isEnabled()).thenReturn(false);
//
//        // when
//        boolean result = chunkedUploadService.isUploadEnabled();
//
//        // then
//        assertThat(result).isFalse();
//    }
//
//    @Test
//    @DisplayName("updateUploadStatus - 업로드 상태 UPLOADING으로 변경")
//    void updateUploadStatus_Uploading() {
//        // given
//        Long recordingId = 1L;
//        RecordingSession session = RecordingSession.builder()
//                .id(recordingId)
//                .studioId("100")
//                .userId(1L)
//                .status(RecordingStatus.COMPLETED)
//                .build();
//
//        when(recordingSessionRepository.findById(recordingId)).thenReturn(Optional.of(session));
//        when(recordingSessionRepository.save(any(RecordingSession.class))).thenReturn(session);
//
//        // when
//        chunkedUploadService.updateUploadStatus(recordingId, UploadStatus.UPLOADING, null);
//
//        // then
//        verify(recordingSessionRepository).findById(recordingId);
//        verify(recordingSessionRepository).save(session);
//        assertThat(session.getExternalUploadStatus()).isEqualTo(UploadStatus.UPLOADING);
//    }
//
//    @Test
//    @DisplayName("updateUploadStatus - 업로드 완료 시 URL 저장")
//    void updateUploadStatus_Completed_WithUrl() {
//        // given
//        Long recordingId = 1L;
//        String externalUrl = "http://external-ec2/files/test.mp4";
//        RecordingSession session = RecordingSession.builder()
//                .id(recordingId)
//                .studioId("100")
//                .userId(1L)
//                .status(RecordingStatus.COMPLETED)
//                .build();
//
//        when(recordingSessionRepository.findById(recordingId)).thenReturn(Optional.of(session));
//        when(recordingSessionRepository.save(any(RecordingSession.class))).thenReturn(session);
//
//        // when
//        chunkedUploadService.updateUploadStatus(recordingId, UploadStatus.COMPLETED, externalUrl);
//
//        // then
//        assertThat(session.getExternalUploadStatus()).isEqualTo(UploadStatus.COMPLETED);
//        assertThat(session.getExternalFileUrl()).isEqualTo(externalUrl);
//        assertThat(session.getExternalUploadedAt()).isNotNull();
//    }
//
//    @Test
//    @DisplayName("updateUploadStatus - 존재하지 않는 세션은 무시")
//    void updateUploadStatus_SessionNotFound_NoAction() {
//        // given
//        Long recordingId = 999L;
//        when(recordingSessionRepository.findById(recordingId)).thenReturn(Optional.empty());
//
//        // when
//        chunkedUploadService.updateUploadStatus(recordingId, UploadStatus.UPLOADING, null);
//
//        // then
//        verify(recordingSessionRepository).findById(recordingId);
//        verify(recordingSessionRepository, never()).save(any());
//    }
//
//    @Test
//    @DisplayName("uploadFileAsync - 전체 업로드 플로우 성공 (Mock)")
//    void uploadFileAsync_FullFlow_Success() throws Exception {
//        // given
//        Long recordingId = 1L;
//        String uploadId = "test-upload-id";
//        String externalFileUrl = "http://external-ec2/files/test_video.mp4";
//
//        RecordingSession session = RecordingSession.builder()
//                .id(recordingId)
//                .studioId("100")
//                .userId(1L)
//                .status(RecordingStatus.COMPLETED)
//                .build();
//
//        // Config Mock
//        when(uploadConfig.getServerUrl()).thenReturn("http://external-ec2:8090/api/upload");
//        when(uploadConfig.getApiKey()).thenReturn("test-api-key");
//        when(uploadConfig.getChunkSize()).thenReturn(1024 * 1024); // 1MB (테스트 파일보다 큼)
//        when(uploadConfig.getMaxRetries()).thenReturn(3);
//        when(uploadConfig.getRetryDelay()).thenReturn(100);
//
//        // Repository Mock
//        when(recordingSessionRepository.findById(recordingId)).thenReturn(Optional.of(session));
//        when(recordingSessionRepository.save(any(RecordingSession.class))).thenReturn(session);
//
//        // Init API Mock
//        Map<String, Object> initResponse = new HashMap<>();
//        initResponse.put("uploadId", uploadId);
//        when(restTemplate.exchange(
//                contains("/init"),
//                eq(HttpMethod.POST),
//                any(HttpEntity.class),
//                eq(Map.class)
//        )).thenReturn(new ResponseEntity<>(initResponse, HttpStatus.OK));
//
//        // Chunk API Mock
//        Map<String, Object> chunkResponse = new HashMap<>();
//        chunkResponse.put("success", true);
//        when(restTemplate.exchange(
//                contains("/chunk/"),
//                eq(HttpMethod.POST),
//                any(HttpEntity.class),
//                eq(Map.class)
//        )).thenReturn(new ResponseEntity<>(chunkResponse, HttpStatus.OK));
//
//        // Complete API Mock
//        Map<String, Object> completeResponse = new HashMap<>();
//        completeResponse.put("fileUrl", externalFileUrl);
//        when(restTemplate.exchange(
//                contains("/complete/"),
//                eq(HttpMethod.POST),
//                any(HttpEntity.class),
//                eq(Map.class)
//        )).thenReturn(new ResponseEntity<>(completeResponse, HttpStatus.OK));
//
//        // when
//        String result = chunkedUploadService.uploadFileAsync(testFilePath.toString(), recordingId).get();
//
//        // then
//        assertThat(result).isEqualTo(externalFileUrl);
//
//        // API 호출 검증
//        verify(restTemplate).exchange(contains("/init"), eq(HttpMethod.POST), any(), eq(Map.class));
//        verify(restTemplate).exchange(contains("/chunk/"), eq(HttpMethod.POST), any(), eq(Map.class));
//        verify(restTemplate).exchange(contains("/complete/"), eq(HttpMethod.POST), any(), eq(Map.class));
//    }
//
//    @Test
//    @DisplayName("청크 크기 계산 테스트")
//    void chunkSizeCalculation() {
//        // given
//        long fileSize = 150 * 1024 * 1024; // 150MB
//        int chunkSize = 50 * 1024 * 1024;  // 50MB
//
//        // when
//        int totalChunks = (int) Math.ceil((double) fileSize / chunkSize);
//
//        // then
//        assertThat(totalChunks).isEqualTo(3);
//    }
//
//    @Test
//    @DisplayName("대용량 파일 청크 분할 계산")
//    void largeFileChunkCalculation() {
//        // given - 5GB 파일, 50MB 청크
//        long fileSize = 5L * 1024 * 1024 * 1024; // 5GB
//        int chunkSize = 50 * 1024 * 1024;        // 50MB
//
//        // when
//        int totalChunks = (int) Math.ceil((double) fileSize / chunkSize);
//
//        // then
//        assertThat(totalChunks).isEqualTo(103); // 5GB / 50MB ≈ 102.4 → 103
//    }
//}
