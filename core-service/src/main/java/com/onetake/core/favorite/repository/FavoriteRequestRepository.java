package com.onetake.core.favorite.repository;

import com.onetake.core.favorite.entity.FavoriteRequest;
import com.onetake.core.favorite.entity.FavoriteRequest.RequestStatus;
import com.onetake.core.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRequestRepository extends JpaRepository<FavoriteRequest, Long> {

    Optional<FavoriteRequest> findByRequestId(String requestId);

    @Query("SELECT fr FROM FavoriteRequest fr JOIN FETCH fr.requester WHERE fr.target = :target AND fr.status = :status")
    List<FavoriteRequest> findAllByTargetAndStatusWithRequester(@Param("target") User target, @Param("status") RequestStatus status);

    @Query("SELECT fr FROM FavoriteRequest fr JOIN FETCH fr.target WHERE fr.requester = :requester AND fr.status = :status")
    List<FavoriteRequest> findAllByRequesterAndStatusWithTarget(@Param("requester") User requester, @Param("status") RequestStatus status);

    boolean existsByRequesterAndTargetAndStatus(User requester, User target, RequestStatus status);

    boolean existsByRequesterAndTarget(User requester, User target);

    Optional<FavoriteRequest> findByRequesterAndTarget(User requester, User target);
}
