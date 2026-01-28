package com.onetake.core.studio.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "studio_members",
        uniqueConstraints = @UniqueConstraint(columnNames = {"studio_id", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class StudioMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "studio_id", nullable = false)
    private Long studioId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private StudioMemberRole role;

    @Column(name = "joined_at")
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    public void changeRole(StudioMemberRole newRole) {
        this.role = newRole;
    }

    public boolean isHost() {
        return this.role == StudioMemberRole.HOST;
    }

    public boolean isManager() {
        return this.role == StudioMemberRole.MANAGER;
    }

    public boolean canManageMembers() {
        return this.role == StudioMemberRole.HOST || this.role == StudioMemberRole.MANAGER;
    }
}
