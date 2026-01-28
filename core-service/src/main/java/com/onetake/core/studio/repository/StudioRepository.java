package com.onetake.core.studio.repository;

import com.onetake.core.studio.entity.Studio;
import com.onetake.core.studio.entity.StudioStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudioRepository extends JpaRepository<Studio, Long> {

    Optional<Studio> findByStudioId(String studioId);

    List<Studio> findByOwnerId(Long ownerId);

    List<Studio> findByOwnerIdAndStatus(Long ownerId, StudioStatus status);

    boolean existsByStudioId(String studioId);
}
