package com.onetake.media.notification.service;

import com.onetake.media.notification.dto.NotificationResponse;
import com.onetake.media.notification.entity.Notification;
import com.onetake.media.notification.entity.NotificationType;
import com.onetake.media.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * 알림 서비스
 * - 알림 생성 및 관리
 * - SSE를 통한 실시간 알림 푸시
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    /**
     * SSE Emitter 저장소 (사용자별)
     * 한 사용자가 여러 탭/디바이스에서 접속할 수 있으므로 List로 관리
     */
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();

    /**
     * SSE 연결 타임아웃 (30분)
     */
    private static final long SSE_TIMEOUT = 30 * 60 * 1000L;

    /**
     * SSE 연결 생성
     */
    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        // 사용자별 Emitter 리스트 가져오기 (없으면 생성)
        CopyOnWriteArrayList<SseEmitter> userEmitters = emitters.computeIfAbsent(
                userId, k -> new CopyOnWriteArrayList<>());

        userEmitters.add(emitter);
        log.info("SSE 연결 생성: userId={}, 활성 연결 수={}", userId, userEmitters.size());

        // 연결 완료 시 초기 더미 이벤트 전송 (연결 확인용)
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data("SSE connected"));
        } catch (IOException e) {
            log.error("SSE 초기 이벤트 전송 실패: userId={}", userId, e);
        }

        // Emitter 제거 핸들러
        Runnable removeEmitter = () -> {
            userEmitters.remove(emitter);
            log.info("SSE 연결 제거: userId={}, 남은 연결 수={}", userId, userEmitters.size());
            if (userEmitters.isEmpty()) {
                emitters.remove(userId);
            }
        };

        emitter.onCompletion(removeEmitter);
        emitter.onTimeout(removeEmitter);
        emitter.onError(e -> {
            log.error("SSE 에러 발생: userId={}", userId, e);
            removeEmitter.run();
        });

        return emitter;
    }

    /**
     * 알림 생성 및 실시간 푸시
     */
    @Transactional
    public NotificationResponse createNotification(String userId, NotificationType type,
                                                   String title, String message, String resourceId) {
        // DB 저장
        Notification notification = Notification.create(userId, type, title, message, resourceId);
        notificationRepository.save(notification);

        log.info("알림 생성: userId={}, type={}, title={}", userId, type, title);

        // 실시간 푸시
        NotificationResponse response = NotificationResponse.from(notification);
        sendToUser(userId, response);

        return response;
    }

    /**
     * 특정 사용자에게 SSE로 알림 전송
     */
    private void sendToUser(String userId, NotificationResponse notification) {
        CopyOnWriteArrayList<SseEmitter> userEmitters = emitters.get(userId);
        if (userEmitters == null || userEmitters.isEmpty()) {
            log.debug("활성 SSE 연결 없음: userId={}", userId);
            return;
        }

        log.info("SSE 알림 전송: userId={}, 연결 수={}, type={}",
                userId, userEmitters.size(), notification.getType());

        // 모든 Emitter에 전송 (여러 탭/디바이스)
        userEmitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                        .name("notification")
                        .data(notification));
                log.debug("SSE 전송 성공: userId={}", userId);
            } catch (IOException e) {
                log.error("SSE 전송 실패: userId={}", userId, e);
                userEmitters.remove(emitter);
            }
        });
    }

    /**
     * 사용자별 알림 목록 조회
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotifications(String userId) {
        return notificationRepository.findByOdUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    /**
     * 읽지 않은 알림 개수
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByOdUserIdAndIsReadFalse(userId);
    }

    /**
     * 알림 읽음 처리
     */
    @Transactional
    public void markAsRead(Long notificationId, String userId) {
        notificationRepository.findById(notificationId)
                .filter(n -> n.getOdUserId().equals(userId))
                .ifPresent(notification -> {
                    notification.markAsRead();
                    notificationRepository.save(notification);
                    log.info("알림 읽음 처리: id={}, userId={}", notificationId, userId);
                });
    }

    /**
     * 모든 알림 읽음 처리
     */
    @Transactional
    public int markAllAsRead(String userId) {
        int count = notificationRepository.markAllAsRead(userId);
        log.info("모든 알림 읽음 처리: userId={}, count={}", userId, count);
        return count;
    }
}
