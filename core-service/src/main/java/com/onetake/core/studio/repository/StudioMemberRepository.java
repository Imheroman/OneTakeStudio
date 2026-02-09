package com.onetake.core.studio.repository;

import com.onetake.core.studio.entity.StudioMember;
import com.onetake.core.studio.entity.StudioMemberRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudioMemberRepository extends JpaRepository<StudioMember, Long> {

    List<StudioMember> findByStudioId(Long studioId);

    List<StudioMember> findByUserId(Long userId);

    Optional<StudioMember> findByStudioIdAndUserId(Long studioId, Long userId);

    boolean existsByStudioIdAndUserId(Long studioId, Long userId);

    Optional<StudioMember> findByStudioIdAndRole(Long studioId, StudioMemberRole role);

    @Query("SELECT sm FROM StudioMember sm WHERE sm.userId = :userId")
    List<StudioMember> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT sm.studioId FROM StudioMember sm WHERE sm.userId = :userId")
    List<Long> findStudioIdsByUserId(@Param("userId") Long userId);

    void deleteByStudioIdAndUserId(Long studioId, Long userId);
}
