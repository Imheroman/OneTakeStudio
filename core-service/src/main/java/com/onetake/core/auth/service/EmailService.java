package com.onetake.core.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    public void sendVerificationEmail(String to, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("[OneTakeStudio] 이메일 인증 코드");
            message.setText(buildVerificationEmailContent(code));

            mailSender.send(message);
            log.info("Verification email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send verification email to: {}", to, e);
        }
    }

    @Async
    public void sendPasswordResetEmail(String to, String resetToken) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("[OneTakeStudio] 비밀번호 재설정");
            message.setText(buildPasswordResetEmailContent(resetToken));

            mailSender.send(message);
            log.info("Password reset email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", to, e);
        }
    }

    private String buildVerificationEmailContent(String code) {
        return String.format("""
            OneTakeStudio 이메일 인증

            아래 인증 코드를 입력해주세요:

            %s

            이 코드는 10분간 유효합니다.
            본인이 요청하지 않았다면 이 이메일을 무시해주세요.
            """, code);
    }

    private String buildPasswordResetEmailContent(String resetToken) {
        return String.format("""
            OneTakeStudio 비밀번호 재설정

            비밀번호를 재설정하려면 아래 토큰을 사용해주세요:

            %s

            이 토큰은 30분간 유효합니다.
            본인이 요청하지 않았다면 이 이메일을 무시해주세요.
            """, resetToken);
    }
}
