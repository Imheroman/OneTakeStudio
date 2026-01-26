package com.onetake.core.auth.service;

import com.onetake.core.auth.entity.PasswordResetToken;
import com.onetake.core.auth.exception.AuthException;
import com.onetake.core.auth.repository.PasswordResetTokenRepository;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${email.password-reset.expiration-minutes:30}")
    private int expirationMinutes;

    @Transactional
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(AuthException::userNotFound);

        passwordResetTokenRepository.invalidateAllTokensForUser(user.getUserId());

        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .used(false)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .build();

        passwordResetTokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(email, token);
    }

    @Transactional
    public void confirmPasswordReset(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenAndUsedFalse(token)
                .orElseThrow(AuthException::passwordResetTokenInvalid);

        if (resetToken.isExpired()) {
            throw AuthException.passwordResetTokenExpired();
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }
}
