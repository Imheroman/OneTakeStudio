package com.onetake.core.studio.service;

import com.onetake.core.notification.entity.Notification;
import com.onetake.core.notification.service.NotificationService;
import com.onetake.core.studio.dto.*;
import com.onetake.core.studio.entity.*;
import com.onetake.core.studio.exception.*;
import com.onetake.core.studio.repository.MemberInviteRepository;
import com.onetake.core.studio.repository.StudioMemberRepository;
import com.onetake.core.studio.repository.StudioRepository;
import com.onetake.core.user.entity.User;
import com.onetake.core.user.exception.UserNotFoundException;
import com.onetake.core.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudioMemberService {

    private final StudioRepository studioRepository;
    private final StudioMemberRepository studioMemberRepository;
    private final MemberInviteRepository memberInviteRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final int INVITE_EXPIRY_DAYS = 7;

    private Long getInternalUserId(String externalUserId) {
        User user = userRepository.findByUserId(externalUserId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        return user.getId();
    }

    public List<StudioMemberResponse> getMembers(String userId, String studioId) {
        log.debug("멤버 목록 조회: studioId={}", studioId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateMemberAccess(studio.getId(), internalUserId);

        return studioMemberRepository.findByStudioId(studio.getId()).stream()
                .map(member -> {
                    User user = userRepository.findById(member.getUserId()).orElse(null);
                    if (user != null) {
                        return StudioMemberResponse.from(member, user.getNickname(), user.getEmail(), user.getProfileImageUrl());
                    }
                    return StudioMemberResponse.from(member);
                })
                .toList();
    }

    @Transactional
    public InviteResponse inviteMember(String userId, String studioId, InviteMemberRequest request) {
        log.debug("멤버 초대 요청: studioId={}, email={}", studioId, request.getEmail());
        User inviter = userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));
        Long internalUserId = inviter.getId();

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateHostOrManagerAccess(studio.getId(), internalUserId);

        StudioMemberRole role = parseRole(request.getRole());
        if (role == StudioMemberRole.HOST) {
            throw new InvalidRoleException("HOST 역할은 초대할 수 없습니다.");
        }

        memberInviteRepository.findByStudioIdAndInviteeEmailAndStatus(studio.getId(), request.getEmail(), InviteStatus.PENDING)
                .ifPresent(invite -> {
                    throw new StudioInUseException("이미 초대된 이메일입니다.");
                });

        // 초대 대상 사용자 조회 (가입된 사용자인 경우)
        Optional<User> inviteeOpt = userRepository.findByEmail(request.getEmail());
        inviteeOpt.ifPresent(user -> {
            if (studioMemberRepository.existsByStudioIdAndUserId(studio.getId(), user.getId())) {
                throw new StudioInUseException("이미 스튜디오의 멤버입니다.");
            }
        });

        MemberInvite invite = MemberInvite.builder()
                .studioId(studio.getId())
                .inviterId(internalUserId)
                .inviteeEmail(request.getEmail())
                .role(role)
                .expiresAt(LocalDateTime.now().plusDays(INVITE_EXPIRY_DAYS))
                .build();

        MemberInvite saved = memberInviteRepository.save(invite);
        log.info("멤버 초대 생성 완료: inviteId={}", saved.getInviteId());

        // 초대 대상 사용자가 가입된 경우 알림 생성
        inviteeOpt.ifPresent(invitee -> {
            Notification notification = Notification.createStudioInvite(
                    invitee,
                    inviter.getNickname(),
                    studio.getName(),
                    saved.getInviteId()
            );
            notificationService.createNotification(notification);
            log.info("스튜디오 초대 알림 생성: invitee={}, studioId={}", invitee.getEmail(), studioId);
        });

        return InviteResponse.from(saved);
    }

    @Transactional
    public void kickMember(String userId, String studioId, Long memberId) {
        log.debug("멤버 강퇴 요청: studioId={}, memberId={}", studioId, memberId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateHostOrManagerAccess(studio.getId(), internalUserId);

        StudioMember targetMember = studioMemberRepository.findById(memberId)
                .orElseThrow(() -> new MemberNotFoundException(memberId));

        if (!targetMember.getStudioId().equals(studio.getId())) {
            throw new MemberNotFoundException(memberId);
        }

        if (targetMember.isHost()) {
            throw new InvalidRoleException("호스트는 강퇴할 수 없습니다.");
        }

        StudioMember requester = studioMemberRepository.findByStudioIdAndUserId(studio.getId(), internalUserId)
                .orElseThrow(StudioAccessDeniedException::new);

        if (requester.isManager() && targetMember.isManager()) {
            throw new StudioAccessDeniedException("매니저는 다른 매니저를 강퇴할 수 없습니다.");
        }

        studioMemberRepository.delete(targetMember);
        log.info("멤버 강퇴 완료: memberId={}", memberId);
    }

    @Transactional
    public StudioMemberResponse updateMemberRole(String userId, String studioId, Long memberId, UpdateMemberRoleRequest request) {
        log.debug("멤버 역할 변경 요청: studioId={}, memberId={}, role={}", studioId, memberId, request.getRole());
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        StudioMember requester = studioMemberRepository.findByStudioIdAndUserId(studio.getId(), internalUserId)
                .orElseThrow(StudioAccessDeniedException::new);

        if (!requester.isHost()) {
            throw new StudioAccessDeniedException("호스트만 역할을 변경할 수 있습니다.");
        }

        StudioMember targetMember = studioMemberRepository.findById(memberId)
                .orElseThrow(() -> new MemberNotFoundException(memberId));

        if (!targetMember.getStudioId().equals(studio.getId())) {
            throw new MemberNotFoundException(memberId);
        }

        if (targetMember.isHost()) {
            throw new InvalidRoleException("호스트의 역할은 변경할 수 없습니다.");
        }

        StudioMemberRole newRole = parseRole(request.getRole());
        if (newRole == StudioMemberRole.HOST) {
            throw new InvalidRoleException("HOST 역할로는 변경할 수 없습니다.");
        }

        targetMember.changeRole(newRole);
        log.info("멤버 역할 변경 완료: memberId={}, newRole={}", memberId, newRole);

        User user = userRepository.findById(targetMember.getUserId()).orElse(null);
        if (user != null) {
            return StudioMemberResponse.from(targetMember, user.getNickname(), user.getEmail(), user.getProfileImageUrl());
        }
        return StudioMemberResponse.from(targetMember);
    }

    private void validateMemberAccess(Long studioId, Long userId) {
        if (!studioMemberRepository.existsByStudioIdAndUserId(studioId, userId)) {
            throw new StudioAccessDeniedException();
        }
    }

    private void validateHostOrManagerAccess(Long studioId, Long userId) {
        StudioMember member = studioMemberRepository.findByStudioIdAndUserId(studioId, userId)
                .orElseThrow(StudioAccessDeniedException::new);

        if (!member.canManageMembers()) {
            throw new StudioAccessDeniedException("호스트 또는 매니저만 수행할 수 있습니다.");
        }
    }

    private StudioMemberRole parseRole(String role) {
        try {
            return StudioMemberRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidRoleException(role);
        }
    }

    public List<ReceivedInviteResponse> getReceivedInvites(String userId) {
        log.debug("받은 초대 목록 조회: userId={}", userId);
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));

        List<MemberInvite> invites = memberInviteRepository.findByInviteeEmailAndStatus(
                user.getEmail(), InviteStatus.PENDING);

        return invites.stream()
                .filter(MemberInvite::isValid)
                .map(invite -> {
                    Studio studio = studioRepository.findById(invite.getStudioId()).orElse(null);
                    User inviter = userRepository.findById(invite.getInviterId()).orElse(null);
                    return ReceivedInviteResponse.from(invite, studio, inviter);
                })
                .filter(response -> response.getStudioId() != null)
                .toList();
    }

    @Transactional
    public StudioMemberResponse acceptInvite(String userId, String inviteId) {
        log.debug("초대 수락: userId={}, inviteId={}", userId, inviteId);
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));

        MemberInvite invite = memberInviteRepository.findByInviteId(inviteId)
                .orElseThrow(() -> new InviteNotFoundException(inviteId));

        if (!invite.getInviteeEmail().equalsIgnoreCase(user.getEmail())) {
            throw new InviteNotForUserException();
        }

        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new InviteNotFoundException(inviteId);
        }

        if (!invite.isValid()) {
            throw new InviteExpiredException(inviteId);
        }

        Studio studio = studioRepository.findById(invite.getStudioId())
                .orElseThrow(() -> new StudioNotFoundException(invite.getStudioId()));

        if (studioMemberRepository.existsByStudioIdAndUserId(studio.getId(), user.getId())) {
            throw new StudioInUseException("이미 스튜디오의 멤버입니다.");
        }

        invite.accept();

        StudioMember member = StudioMember.builder()
                .studioId(studio.getId())
                .userId(user.getId())
                .role(invite.getRole())
                .build();

        StudioMember saved = studioMemberRepository.save(member);
        log.info("초대 수락 완료: inviteId={}, memberId={}", inviteId, saved.getId());

        return StudioMemberResponse.from(saved, user.getNickname(), user.getEmail(), user.getProfileImageUrl());
    }

    @Transactional
    public void rejectInvite(String userId, String inviteId) {
        log.debug("초대 거절: userId={}, inviteId={}", userId, inviteId);
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("사용자를 찾을 수 없습니다."));

        MemberInvite invite = memberInviteRepository.findByInviteId(inviteId)
                .orElseThrow(() -> new InviteNotFoundException(inviteId));

        if (!invite.getInviteeEmail().equalsIgnoreCase(user.getEmail())) {
            throw new InviteNotForUserException();
        }

        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new InviteNotFoundException(inviteId);
        }

        invite.reject();
        log.info("초대 거절 완료: inviteId={}", inviteId);
    }

    public List<InviteResponse> getStudioInvites(String userId, String studioId) {
        log.debug("스튜디오 초대 목록 조회: studioId={}", studioId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateHostOrManagerAccess(studio.getId(), internalUserId);

        return memberInviteRepository.findByStudioIdAndStatus(studio.getId(), InviteStatus.PENDING).stream()
                .map(InviteResponse::from)
                .toList();
    }

    @Transactional
    public void cancelInvite(String userId, String studioId, String inviteId) {
        log.debug("초대 취소: studioId={}, inviteId={}", studioId, inviteId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        validateHostOrManagerAccess(studio.getId(), internalUserId);

        MemberInvite invite = memberInviteRepository.findByInviteId(inviteId)
                .orElseThrow(() -> new InviteNotFoundException(inviteId));

        if (!invite.getStudioId().equals(studio.getId())) {
            throw new InviteNotFoundException(inviteId);
        }

        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new InviteNotFoundException(inviteId);
        }

        memberInviteRepository.delete(invite);
        log.info("초대 취소 완료: inviteId={}", inviteId);
    }

    @Transactional
    public void leaveStudio(String userId, String studioId) {
        log.debug("스튜디오 탈퇴: userId={}, studioId={}", userId, studioId);
        Long internalUserId = getInternalUserId(userId);

        Studio studio = studioRepository.findByStudioId(studioId)
                .orElseThrow(() -> new StudioNotFoundException(studioId));

        StudioMember member = studioMemberRepository.findByStudioIdAndUserId(studio.getId(), internalUserId)
                .orElseThrow(StudioAccessDeniedException::new);

        if (member.isHost()) {
            throw new HostCannotLeaveException();
        }

        studioMemberRepository.delete(member);
        log.info("스튜디오 탈퇴 완료: userId={}, studioId={}", userId, studioId);
    }
}
