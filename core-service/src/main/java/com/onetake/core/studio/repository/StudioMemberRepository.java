package com.onetake.core.studio.repository;

import com.onetake.core.studio.entity.StudioMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudioMemberRepository extends JpaRepository<StudioMember, Long> {

    List<StudioMember> findByUserIdOrderByJoinedAtDesc(Long userId);

    List<StudioMember> findByStudioId(Long studioId);

    long countByStudioId(Long studioId);
}
