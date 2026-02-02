package com.onetake.media.studio.service;

import com.onetake.media.studio.dto.StudioStateMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 스튜디오 접속자 추적 서비스
 * 스튜디오별 현재 접속 중인 멤버 목록을 관리
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StudioPresenceService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 스튜디오별 접속자 목록
     * Key: studioId, Value: Map<userId, OnlineMember>
     */
    private final Map<Long, Map<String, OnlineMember>> studioMembers = new ConcurrentHashMap<>();

    public record OnlineMember(
            String odUserId,
            String nickname,
            LocalDateTime joinedAt
    ) {}

    /**
     * 멤버 입장 처리
     * 1. 접속자 목록에 추가
     * 2. 기존 접속자들에게 MEMBER_JOINED 브로드캐스트
     * 3. 새 접속자에게 현재 접속자 목록(CURRENT_MEMBERS) 전송
     */
    public void memberJoined(Long studioId, String userId, String nickname) {
        Map<String, OnlineMember> members = studioMembers.computeIfAbsent(studioId, k -> new ConcurrentHashMap<>());

        // 이미 접속 중이면 무시
        if (members.containsKey(userId)) {
            log.debug("이미 접속 중인 멤버: studioId={}, userId={}", studioId, userId);
            return;
        }

        // 현재 접속자 목록 (새 멤버 추가 전)
        List<Map<String, Object>> currentMembers = members.values().stream()
                .map(m -> {
                    Map<String, Object> memberMap = new HashMap<>();
                    memberMap.put("odUserId", m.odUserId());
                    memberMap.put("nickname", m.nickname());
                    memberMap.put("joinedAt", m.joinedAt().toString());
                    return memberMap;
                })
                .toList();

        // 새 멤버 추가
        OnlineMember newMember = new OnlineMember(userId, nickname, LocalDateTime.now());
        members.put(userId, newMember);

        log.info("멤버 입장: studioId={}, userId={}, nickname={}, 현재 인원: {}",
                studioId, userId, nickname, members.size());

        // 1. 기존 접속자들에게 MEMBER_JOINED 브로드캐스트
        StudioStateMessage joinedMessage = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.MEMBER_JOINED)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/presence", joinedMessage);

        // 2. 새 접속자에게 현재 접속자 목록 전송 (본인 포함)
        List<Map<String, Object>> allMembers = new ArrayList<>(currentMembers);
        Map<String, Object> selfMap = new HashMap<>();
        selfMap.put("odUserId", userId);
        selfMap.put("nickname", nickname);
        selfMap.put("joinedAt", newMember.joinedAt().toString());
        allMembers.add(selfMap);

        StudioStateMessage currentMembersMessage = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.CURRENT_MEMBERS)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .payload(Map.of("members", allMembers))
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();

        // 해당 사용자에게만 전송 (user-specific destination)
        messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/studio/" + studioId + "/presence",
                currentMembersMessage
        );

        // 대안: 전체 브로드캐스트 (프론트에서 필터링)
        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/presence", currentMembersMessage);
    }

    /**
     * 멤버 퇴장 처리
     */
    public void memberLeft(Long studioId, String userId, String nickname) {
        Map<String, OnlineMember> members = studioMembers.get(studioId);
        if (members == null) return;

        OnlineMember removed = members.remove(userId);
        if (removed == null) {
            log.debug("퇴장 처리할 멤버 없음: studioId={}, userId={}", studioId, userId);
            return;
        }

        log.info("멤버 퇴장: studioId={}, userId={}, nickname={}, 남은 인원: {}",
                studioId, userId, nickname, members.size());

        // 남은 멤버들에게 MEMBER_LEFT 브로드캐스트
        StudioStateMessage leftMessage = StudioStateMessage.builder()
                .type(StudioStateMessage.StudioStateType.MEMBER_LEFT)
                .studioId(studioId)
                .userId(userId)
                .nickname(nickname)
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .build();
        messagingTemplate.convertAndSend("/topic/studio/" + studioId + "/presence", leftMessage);

        // 스튜디오에 아무도 없으면 정리
        if (members.isEmpty()) {
            studioMembers.remove(studioId);
        }
    }

    /**
     * 현재 접속자 목록 조회
     */
    public List<OnlineMember> getOnlineMembers(Long studioId) {
        Map<String, OnlineMember> members = studioMembers.get(studioId);
        if (members == null) return Collections.emptyList();
        return new ArrayList<>(members.values());
    }

    /**
     * 특정 멤버가 접속 중인지 확인
     */
    public boolean isOnline(Long studioId, String userId) {
        Map<String, OnlineMember> members = studioMembers.get(studioId);
        return members != null && members.containsKey(userId);
    }
}
