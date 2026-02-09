package com.onetake.media.settings.repository;

import com.onetake.media.settings.entity.UserMediaSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserMediaSettingsRepository extends JpaRepository<UserMediaSettings, Long> {

    Optional<UserMediaSettings> findByOdUserId(String odUserId);

    Optional<UserMediaSettings> findBySettingsId(String settingsId);

    boolean existsByOdUserId(String odUserId);
}
