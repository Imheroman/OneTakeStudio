package com.onetake.core.auth.repository;

import com.onetake.core.auth.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findByEmailAndCodeAndVerifiedFalse(String email, String code);

    Optional<EmailVerification> findByEmailAndVerifiedTrue(String email);

    @Modifying
    @Query("DELETE FROM EmailVerification e WHERE e.expiresAt < :now")
    void deleteExpiredTokens(@Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM EmailVerification e WHERE e.email = :email")
    void deleteByEmail(@Param("email") String email);
}
