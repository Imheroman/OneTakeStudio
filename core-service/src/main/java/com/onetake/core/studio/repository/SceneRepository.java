package com.onetake.core.studio.repository;

import com.onetake.core.studio.entity.Scene;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SceneRepository extends JpaRepository<Scene, Long> {

    Optional<Scene> findBySceneId(String sceneId);

    List<Scene> findByStudioIdOrderBySortOrderAsc(Long studioId);

    List<Scene> findByStudioId(Long studioId);

    Optional<Scene> findByStudioIdAndIsActiveTrue(Long studioId);

    int countByStudioId(Long studioId);

    void deleteByStudioId(Long studioId);
}
