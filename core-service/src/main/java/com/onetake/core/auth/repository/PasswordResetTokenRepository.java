package com.onetake.core.auth.repository;

import com.onetake.core.auth.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenAndUsedFalse(String token);

    @Modifying
    @Query("DELETE FROM PasswordResetToken p WHERE p.expiresAt < :now OR p.used = true")
    void deleteExpiredOrUsedTokens(@Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE PasswordResetToken p SET p.used = true WHERE p.user.userId = :userId")
    void invalidateAllTokensForUser(@Param("userId") Long userId);
}
