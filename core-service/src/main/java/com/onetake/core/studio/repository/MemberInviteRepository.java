package com.onetake.core.studio.repository;

import com.onetake.core.studio.entity.InviteStatus;
import com.onetake.core.studio.entity.MemberInvite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MemberInviteRepository extends JpaRepository<MemberInvite, Long> {

    Optional<MemberInvite> findByInviteId(String inviteId);

    List<MemberInvite> findByStudioId(Long studioId);

    List<MemberInvite> findByStudioIdAndStatus(Long studioId, InviteStatus status);

    List<MemberInvite> findByInviteeEmail(String inviteeEmail);

    List<MemberInvite> findByInviteeEmailAndStatus(String inviteeEmail, InviteStatus status);

    Optional<MemberInvite> findByStudioIdAndInviteeEmailAndStatus(Long studioId, String inviteeEmail, InviteStatus status);

    List<MemberInvite> findByStatusAndExpiresAtBefore(InviteStatus status, LocalDateTime dateTime);
}
