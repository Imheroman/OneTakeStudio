package com.onetake.storage.upload.repository;

import com.onetake.storage.upload.entity.UploadSession;
import com.onetake.storage.upload.entity.UploadSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UploadSessionRepository extends JpaRepository<UploadSession, Long> {

    Optional<UploadSession> findByUploadId(String uploadId);

    List<UploadSession> findByStatusAndExpiresAtBefore(UploadSessionStatus status, LocalDateTime dateTime);

    List<UploadSession> findByStatusIn(List<UploadSessionStatus> statuses);
}
