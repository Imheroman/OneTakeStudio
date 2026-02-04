package com.onetake.media.stream.service;

import com.onetake.media.global.config.LiveKitConfig;
import com.onetake.media.global.exception.BusinessException;
import com.onetake.media.global.exception.ErrorCode;
import com.onetake.media.stream.dto.StreamTokenRequest;
import com.onetake.media.stream.dto.StreamTokenResponse;
import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import io.livekit.server.RoomServiceClient;
import livekit.LivekitModels;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveKitService {

    private final LiveKitConfig liveKitConfig;
    private final RoomServiceClient roomServiceClient;

    public StreamTokenResponse generateToken(Long userId, String studioId, StreamTokenRequest request) {
        try {
            String roomName = generateRoomName(studioId);
            String participantIdentity = generateParticipantIdentity(userId, request.getParticipantName());

            AccessToken accessToken = liveKitConfig.createAccessToken();
            accessToken.setIdentity(participantIdentity);
            accessToken.setName(request.getParticipantName());

            if (request.getMetadata() != null) {
                accessToken.setMetadata(request.getMetadata());
            }

            accessToken.addGrants(
                    new RoomJoin(true),
                    new RoomName(roomName)
            );

            String token = accessToken.toJwt();

            return StreamTokenResponse.builder()
                    .token(token)
                    .roomName(roomName)
                    .participantIdentity(participantIdentity)
                    .livekitUrl(liveKitConfig.getHost())
                    .build();

        } catch (Exception e) {
            log.error("Failed to generate LiveKit token", e);
            String detail = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            throw new BusinessException(
                    ErrorCode.LIVEKIT_TOKEN_GENERATION_FAILED,
                    "LiveKit 토큰 생성에 실패했습니다. " + detail
            );
        }
    }

    public void createRoom(String roomName) {
        try {
            roomServiceClient.createRoom(roomName);
            log.info("LiveKit room created: {}", roomName);
        } catch (Exception e) {
            log.error("Failed to create LiveKit room: {}", roomName, e);
            throw new BusinessException(ErrorCode.STREAM_CONNECTION_FAILED, e);
        }
    }

    public void deleteRoom(String roomName) {
        try {
            roomServiceClient.deleteRoom(roomName);
            log.info("LiveKit room deleted: {}", roomName);
        } catch (Exception e) {
            log.warn("Failed to delete LiveKit room: {}", roomName, e);
        }
    }

    public List<LivekitModels.Room> listRooms() {
        try {
            retrofit2.Response<List<LivekitModels.Room>> response = roomServiceClient.listRooms().execute();
            if (response.isSuccessful() && response.body() != null) {
                return response.body();
            }
            return List.of();
        } catch (Exception e) {
            log.error("Failed to list LiveKit rooms", e);
            throw new BusinessException(ErrorCode.STREAM_CONNECTION_FAILED, e);
        }
    }

    public List<LivekitModels.ParticipantInfo> listParticipants(String roomName) {
        try {
            retrofit2.Response<List<LivekitModels.ParticipantInfo>> response = roomServiceClient.listParticipants(roomName).execute();
            if (response.isSuccessful() && response.body() != null) {
                return response.body();
            }
            return List.of();
        } catch (Exception e) {
            log.error("Failed to list participants in room: {}", roomName, e);
            throw new BusinessException(ErrorCode.STREAM_CONNECTION_FAILED, e);
        }
    }

    public void removeParticipant(String roomName, String participantIdentity) {
        try {
            roomServiceClient.removeParticipant(roomName, participantIdentity);
            log.info("Participant removed from room {}: {}", roomName, participantIdentity);
        } catch (Exception e) {
            log.error("Failed to remove participant {} from room {}", participantIdentity, roomName, e);
        }
    }

    private String generateRoomName(String studioId) {
        return "studio-" + studioId;
    }

    private String generateParticipantIdentity(Long userId, String participantName) {
        return "user-" + userId + "-" + participantName.replaceAll("\\s+", "-").toLowerCase();
    }
}
