package com.onetake.media.settings.repository;

import com.onetake.media.settings.entity.UserMediaSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserMediaSettingsRepository extends JpaRepository<UserMediaSettings, Long> {

    Optional<UserMediaSettings> findByUserId(Long userId);

    Optional<UserMediaSettings> findBySettingsId(String settingsId);

    boolean existsByUserId(Long userId);
}
