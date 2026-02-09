package com.onetake.core.favorite.repository;

import com.onetake.core.favorite.entity.Favorite;
import com.onetake.core.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    @Query("SELECT f FROM Favorite f JOIN FETCH f.target WHERE f.owner = :owner")
    List<Favorite> findAllByOwnerWithTarget(@Param("owner") User owner);

    Optional<Favorite> findByFavoriteId(String favoriteId);

    boolean existsByOwnerAndTarget(User owner, User target);

    long countByOwner(User owner);
}
