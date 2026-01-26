package com.onetake.core.auth.service;

import com.onetake.core.auth.entity.EmailVerification;
import com.onetake.core.auth.exception.AuthException;
import com.onetake.core.auth.repository.EmailVerificationRepository;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${email.verification.expiration-minutes:10}")
    private int expirationMinutes;

    @Value("${email.verification.code-length:6}")
    private int codeLength;

    @Transactional
    public void sendVerificationCode(String email) {
        if (userRepository.existsByEmail(email)) {
            throw AuthException.duplicateEmail();
        }

        emailVerificationRepository.deleteByEmail(email);

        String code = generateCode();

        EmailVerification verification = EmailVerification.builder()
                .email(email)
                .code(code)
                .verified(false)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .build();

        emailVerificationRepository.save(verification);

        emailService.sendVerificationEmail(email, code);
    }

    @Transactional
    public void verifyCode(String email, String code) {
        EmailVerification verification = emailVerificationRepository
                .findByEmailAndCodeAndVerifiedFalse(email, code)
                .orElseThrow(AuthException::verificationCodeInvalid);

        if (verification.isExpired()) {
            throw AuthException.verificationCodeExpired();
        }

        verification.setVerified(true);
        emailVerificationRepository.save(verification);
    }

    @Transactional(readOnly = true)
    public boolean isEmailVerified(String email) {
        return emailVerificationRepository.findByEmailAndVerifiedTrue(email).isPresent();
    }

    @Transactional
    public void deleteVerification(String email) {
        emailVerificationRepository.deleteByEmail(email);
    }

    private String generateCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < codeLength; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }
}
