package com.onetake.core.auth.scheduler;

import com.onetake.core.auth.repository.EmailVerificationRepository;
import com.onetake.core.auth.repository.PasswordResetTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class TokenCleanupScheduler {

    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Starting cleanup of expired tokens");

        LocalDateTime now = LocalDateTime.now();

        emailVerificationRepository.deleteExpiredTokens(now);
        passwordResetTokenRepository.deleteExpiredOrUsedTokens(now);

        log.info("Completed cleanup of expired tokens");
    }
}
