package com.onetake.core.user.repository;

import com.onetake.core.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUserId(String userId);

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    /**
     * 이메일 또는 닉네임으로 사용자 검색
     */
    @Query("SELECT u FROM User u WHERE u.isActive = true AND " +
            "(LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(u.nickname) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<User> searchByEmailOrNickname(@Param("query") String query);
}
