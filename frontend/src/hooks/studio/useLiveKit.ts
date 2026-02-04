"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
  LocalTrack,
  createLocalTracks,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
} from "livekit-client";
import { joinStream, leaveStream } from "@/shared/api/studio-stream";

export interface UseLiveKitOptions {
  studioId: string | number;
  participantName: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

export interface UseLiveKitReturn {
  room: Room | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  localVideoTrack: LocalVideoTrack | null;
  localAudioTrack: LocalAudioTrack | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
}

export function useLiveKit(options: UseLiveKitOptions): UseLiveKitReturn {
  const { studioId, participantName, onConnected, onDisconnected, onError } = options;

  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  );
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const roomRef = useRef<Room | null>(null);

  const isConnected = connectionState === ConnectionState.Connected;
  const isConnecting = connectionState === ConnectionState.Connecting;

  // Room 이벤트 핸들러 설정
  const setupRoomEvents = useCallback(
    (room: Room) => {
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        setConnectionState(state);
        if (state === ConnectionState.Connected) {
          onConnected?.();
        } else if (state === ConnectionState.Disconnected) {
          onDisconnected?.();
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnectionState(ConnectionState.Disconnected);
        onDisconnected?.();
      });

      room.on(RoomEvent.MediaDevicesError, (error) => {
        console.error("Media devices error:", error);
        onError?.(error as Error);
      });
    },
    [onConnected, onDisconnected, onError]
  );

  // LiveKit 연결
  const connect = useCallback(async () => {
    if (roomRef.current?.state === ConnectionState.Connected) {
      console.log("Already connected to LiveKit");
      return;
    }

    try {
      setConnectionState(ConnectionState.Connecting);

      // 1. 서버에서 토큰 발급
      const tokenResponse = await joinStream({
        studioId,
        participantName,
      });

      // 2. Room 생성 및 연결
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 30 },
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setupRoomEvents(newRoom);
      roomRef.current = newRoom;
      setRoom(newRoom);

      // 3. 로컬 트랙 생성
      const tracks = await createLocalTracks({
        video: true,
        audio: true,
      });

      const videoTrack = tracks.find(
        (t) => t.kind === Track.Kind.Video
      ) as LocalVideoTrack | undefined;
      const audioTrack = tracks.find(
        (t) => t.kind === Track.Kind.Audio
      ) as LocalAudioTrack | undefined;

      if (videoTrack) setLocalVideoTrack(videoTrack);
      if (audioTrack) setLocalAudioTrack(audioTrack);

      // 4. Room 연결
      await newRoom.connect(tokenResponse.livekitUrl, tokenResponse.token);

      // 5. 트랙 퍼블리시
      for (const track of tracks) {
        await newRoom.localParticipant.publishTrack(track);
      }

      console.log("Connected to LiveKit room:", tokenResponse.roomName);
    } catch (error) {
      console.error("Failed to connect to LiveKit:", error);
      setConnectionState(ConnectionState.Disconnected);
      onError?.(error as Error);
      throw error;
    }
  }, [studioId, participantName, setupRoomEvents, onError]);

  // LiveKit 연결 해제
  const disconnect = useCallback(async () => {
    try {
      // 로컬 트랙 정리
      if (localVideoTrack) {
        localVideoTrack.stop();
        setLocalVideoTrack(null);
      }
      if (localAudioTrack) {
        localAudioTrack.stop();
        setLocalAudioTrack(null);
      }

      // Room 연결 해제
      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
        setRoom(null);
      }

      // 서버에 퇴장 알림
      await leaveStream(studioId).catch(console.error);

      setConnectionState(ConnectionState.Disconnected);
      console.log("Disconnected from LiveKit");
    } catch (error) {
      console.error("Failed to disconnect from LiveKit:", error);
    }
  }, [studioId, localVideoTrack, localAudioTrack]);

  // 비디오 토글
  const toggleVideo = useCallback(async () => {
    if (!localVideoTrack) return;

    if (isVideoEnabled) {
      await localVideoTrack.mute();
    } else {
      await localVideoTrack.unmute();
    }
    setIsVideoEnabled(!isVideoEnabled);
  }, [localVideoTrack, isVideoEnabled]);

  // 오디오 토글
  const toggleAudio = useCallback(async () => {
    if (!localAudioTrack) return;

    if (isAudioEnabled) {
      await localAudioTrack.mute();
    } else {
      await localAudioTrack.unmute();
    }
    setIsAudioEnabled(!isAudioEnabled);
  }, [localAudioTrack, isAudioEnabled]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      localVideoTrack?.stop();
      localAudioTrack?.stop();
    };
  }, []);

  return {
    room,
    connectionState,
    isConnected,
    isConnecting,
    localVideoTrack,
    localAudioTrack,
    connect,
    disconnect,
    toggleVideo,
    toggleAudio,
    isVideoEnabled,
    isAudioEnabled,
  };
}
