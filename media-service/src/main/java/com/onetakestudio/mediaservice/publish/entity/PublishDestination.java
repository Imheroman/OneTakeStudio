package com.onetakestudio.mediaservice.publish.entity;

import com.onetakestudio.mediaservice.global.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "publish_destinations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PublishDestination extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "publish_destination_id", unique = true, nullable = false, updatable = false, length = 36)
    private String publishDestinationId;

    @Column(name = "publish_session_id", nullable = false)
    private Long publishSessionId;

    @Column(name = "connected_destination_id", nullable = false)
    private Long connectedDestinationId;

    @Column(name = "platform", nullable = false, length = 50)
    private String platform;

    @Column(name = "rtmp_url")
    private String rtmpUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "connection_status", nullable = false)
    private ConnectionStatus connectionStatus;

    @Column(name = "connected_at")
    private LocalDateTime connectedAt;

    @Column(name = "disconnected_at")
    private LocalDateTime disconnectedAt;

    @Column(name = "error_message")
    private String errorMessage;

    @PrePersist
    public void prePersist() {
        if (this.publishDestinationId == null) {
            this.publishDestinationId = UUID.randomUUID().toString();
        }
    }

    public void markConnected() {
        this.connectionStatus = ConnectionStatus.CONNECTED;
        this.connectedAt = LocalDateTime.now();
    }

    public void markDisconnected() {
        this.connectionStatus = ConnectionStatus.DISCONNECTED;
        this.disconnectedAt = LocalDateTime.now();
    }

    public void markFailed(String errorMessage) {
        this.connectionStatus = ConnectionStatus.FAILED;
        this.errorMessage = errorMessage;
        this.disconnectedAt = LocalDateTime.now();
    }

    public enum ConnectionStatus {
        PENDING,
        CONNECTING,
        CONNECTED,
        DISCONNECTED,
        FAILED
    }
}
