package com.onetake.media.recording.service;

import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetUrlRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.File;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3UploadService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    @Value("${aws.s3.recordings-prefix:recordings}")
    private String recordingsPrefix;

    public String uploadRecording(Long studioId, File file) {
        try {
            String key = generateS3Key(studioId, file.getName());

            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(getContentType(file.getName()))
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromFile(file));

            log.info("Recording uploaded to S3: bucket={}, key={}", bucketName, key);
            return key;

        } catch (Exception e) {
            log.error("Failed to upload recording to S3", e);
            throw new BusinessException(ErrorCode.S3_UPLOAD_FAILED, e);
        }
    }

    public String getS3Url(String key) {
        GetUrlRequest request = GetUrlRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        return s3Client.utilities().getUrl(request).toString();
    }

    private String generateS3Key(Long studioId, String fileName) {
        String datePrefix = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        return String.format("%s/studio-%d/%s/%s", recordingsPrefix, studioId, datePrefix, fileName);
    }

    private String getContentType(String fileName) {
        if (fileName.endsWith(".mp4")) {
            return "video/mp4";
        } else if (fileName.endsWith(".webm")) {
            return "video/webm";
        } else if (fileName.endsWith(".mkv")) {
            return "video/x-matroska";
        }
        return "application/octet-stream";
    }
}
