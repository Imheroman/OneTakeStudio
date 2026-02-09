package com.onetake.media.recording.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class ThumbnailService {

    @Value("${ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Value("${recording.storage.base-path:/recordings}")
    private String basePath;

    /**
     * 영상 파일에서 첫 프레임 추출하여 썸네일 생성
     * @param relativeVideoPath 상대 경로 (e.g. user-xxx/video.mp4)
     * @return 썸네일 상대 경로 (e.g. user-xxx/video_thumb.jpg), 실패 시 null
     */
    public String generateThumbnail(String relativeVideoPath) {
        try {
            String thumbnailRelPath = relativeVideoPath.replaceAll("\\.[^.]+$", "_thumb.jpg");
            Path inputPath = Paths.get(basePath, relativeVideoPath);
            Path outputPath = Paths.get(basePath, thumbnailRelPath);

            if (!Files.exists(inputPath)) {
                log.warn("썸네일 생성 실패 - 영상 파일 없음: {}", inputPath);
                return null;
            }

            Files.createDirectories(outputPath.getParent());

            ProcessBuilder pb = new ProcessBuilder(
                    ffmpegPath, "-y",
                    "-i", inputPath.toString(),
                    "-ss", "00:00:01",
                    "-frames:v", "1",
                    "-q:v", "2",
                    outputPath.toString()
            );
            pb.redirectErrorStream(true);

            Process process = pb.start();
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                log.error("썸네일 생성 타임아웃: {}", relativeVideoPath);
                return null;
            }

            if (process.exitValue() != 0) {
                log.error("썸네일 생성 실패 (exit code: {}): {}", process.exitValue(), relativeVideoPath);
                return null;
            }

            if (Files.exists(outputPath) && Files.size(outputPath) > 0) {
                log.info("썸네일 생성 완료: {}", thumbnailRelPath);
                return thumbnailRelPath;
            }

            log.warn("썸네일 파일이 생성되지 않음: {}", outputPath);
            return null;

        } catch (Exception e) {
            log.error("썸네일 생성 중 오류: {}", relativeVideoPath, e);
            return null;
        }
    }
}
