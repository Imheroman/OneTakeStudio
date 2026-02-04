/**
 * 스튜디오 LiveKit 연결 및 미디어 공유 훅
 * 스튜디오 입장 시 자동으로 LiveKit Room에 연결하고 미디어를 공유합니다.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
  LocalTrack,
  RemoteTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  Track,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
  createLocalScreenTracks,
} from "livekit-client";
import { joinStream, leaveStream } from "@/shared/api/studio-stream";

export interface RemoteSource {
  id: string;
  participantId: string;
  participantName: string;
  trackSid: string;
  type: "video" | "audio" | "screen";
  track: RemoteTrack;
}

export interface LocalPublishedTrack {
  sourceId: string;
  track: LocalTrack;
  trackSid?: string;
}

export interface UseStudioLiveKitOptions {
  studioId: number;
  userId: string;
  nickname: string;
  enabled?: boolean;
  /** 트랙이 ended될 때 호출 (화면 공유 중지 등) */
  onTrackEnded?: (sourceId: string) => void;
}

export interface UseStudioLiveKitReturn {
  /** LiveKit 연결 상태 */
  isConnected: boolean;
  /** Room 객체 */
  room: Room | null;
  /** 현재 Room 가져오기 (handleGoLive 등에서 최신 참조용) */
  getRoom: () => Room | null;
  /** 원격 소스 목록 (다른 참가자가 공유한 미디어) */
  remoteSources: RemoteSource[];
  /** 내가 publish한 트랙 목록 */
  publishedTracks: LocalPublishedTrack[];
  /** 로컬 publish 스트림 캐시 (Go Live 시 캔버스가 화면공유를 그리기 위해 유지) */
  localPublishedStreamsRef: React.MutableRefObject<Map<string, MediaStream>>;
  /** 비디오 트랙 publish */
  publishVideoTrack: (sourceId: string, deviceId?: string) => Promise<string | null>;
  /** 오디오 트랙 publish */
  publishAudioTrack: (sourceId: string, deviceId?: string) => Promise<string | null>;
  /** 화면 공유 트랙 publish */
  publishScreenTrack: (sourceId: string) => Promise<string | null>;
  /** 트랙 unpublish. keepTrackAlive=true면 track.stop() 생략 (캔버스 그리기용 유지) */
  unpublishTrack: (sourceId: string, options?: { keepTrackAlive?: boolean }) => Promise<void>;
  /** 특정 원격 소스의 MediaStream 가져오기 */
  getRemoteStream: (trackSid: string) => MediaStream | null;
}

export function useStudioLiveKit(options: UseStudioLiveKitOptions): UseStudioLiveKitReturn {
  const { studioId, userId, nickname, enabled = true, onTrackEnded } = options;

  const roomRef = useRef<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteSources, setRemoteSources] = useState<RemoteSource[]>([]);
  const [publishedTracks, setPublishedTracks] = useState<LocalPublishedTrack[]>([]);
  /** Go Live 시 캔버스가 화면공유/웹캠을 그리기 위해 유지 (unpublish 후에도 사용) */
  const localPublishedStreamsRef = useRef<Map<string, MediaStream>>(new Map());

  // LiveKit Room 연결
  useEffect(() => {
    if (!enabled || !studioId || studioId === 0 || !userId) {
      return;
    }

    let mounted = true;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 30 },
      },
    });

    const connectToRoom = async () => {
      try {
        console.log("[StudioLiveKit] LiveKit 연결 시도...");

        const tokenResponse = await joinStream({
          studioId,
          participantName: nickname || "Guest",
        });

        // 이벤트 핸들러 등록
        room.on(RoomEvent.Connected, () => {
          if (mounted) {
            console.log("[StudioLiveKit] LiveKit 연결됨");
            setIsConnected(true);
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          if (mounted) {
            console.log("[StudioLiveKit] LiveKit 연결 해제됨");
            setIsConnected(false);
            setRemoteSources([]);
          }
        });

        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          if (mounted) {
            setIsConnected(state === ConnectionState.Connected);
          }
        });

        // 원격 트랙 구독
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (mounted) {
            handleTrackSubscribed(track, publication, participant);
          }
        });

        // 원격 트랙 구독 해제
        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (mounted) {
            handleTrackUnsubscribed(track, publication, participant);
          }
        });

        // Room 연결
        await room.connect(tokenResponse.livekitUrl, tokenResponse.token);
        roomRef.current = room;

        console.log("[StudioLiveKit] LiveKit Room 연결 완료:", tokenResponse.roomName);
      } catch (error) {
        console.error("[StudioLiveKit] LiveKit 연결 실패:", error);
      }
    };

    connectToRoom();

    return () => {
      mounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      setIsConnected(false);
      setRemoteSources([]);
      setPublishedTracks([]);
    };
  }, [enabled, studioId, userId, nickname]);

  // 원격 트랙 구독 핸들러
  const handleTrackSubscribed = useCallback(
    (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log("[StudioLiveKit] 원격 트랙 구독:", {
        trackSid: track.sid,
        trackName: publication.trackName,
        kind: track.kind,
        participant: participant.identity,
      });

      // 내 트랙은 무시
      if (participant.identity === userId) {
        return;
      }

      // track.sid가 없으면 무시
      if (!track.sid) {
        console.warn("[StudioLiveKit] 트랙 SID가 없음, 무시");
        return;
      }

      const type: "video" | "audio" | "screen" =
        track.source === Track.Source.ScreenShare
          ? "screen"
          : track.kind === Track.Kind.Video
            ? "video"
            : "audio";

      const trackSid = track.sid;
      // publication.trackName은 publish할 때 설정한 sourceId
      // 원래 sourceId를 사용해서 SOURCE_ADDED로 받은 소스와 매칭
      const sourceId = publication.trackName || `remote-${trackSid}`;
      const remoteSource: RemoteSource = {
        id: sourceId,
        participantId: participant.identity,
        participantName: participant.name || participant.identity,
        trackSid,
        type,
        track,
      };

      setRemoteSources((prev) => {
        // 중복 방지 (trackSid 또는 id로 체크)
        if (prev.some((s) => s.trackSid === trackSid || s.id === sourceId)) {
          return prev;
        }
        return [...prev, remoteSource];
      });
    },
    [userId]
  );

  // 원격 트랙 구독 해제 핸들러
  const handleTrackUnsubscribed = useCallback(
    (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log("[StudioLiveKit] 원격 트랙 구독 해제:", track.sid);

      setRemoteSources((prev) => prev.filter((s) => s.trackSid !== track.sid));
    },
    []
  );

  // 비디오 트랙 publish
  const publishVideoTrack = useCallback(
    async (sourceId: string, deviceId?: string): Promise<string | null> => {
      const room = roomRef.current;
      if (!room || room.state !== ConnectionState.Connected) {
        console.warn("[StudioLiveKit] Room이 연결되지 않음");
        return null;
      }

      try {
        const track = await createLocalVideoTrack({
          deviceId,
          resolution: { width: 1280, height: 720, frameRate: 30 },
        });

        const publication = await room.localParticipant.publishTrack(track, {
          name: sourceId,
          source: Track.Source.Camera,
        });

        const trackSid = publication.trackSid;
        console.log("[StudioLiveKit] 비디오 트랙 publish 완료:", trackSid);

        if (track.mediaStreamTrack) {
          localPublishedStreamsRef.current.set(sourceId, new MediaStream([track.mediaStreamTrack]));
        }
        setPublishedTracks((prev) => [...prev, { sourceId, track, trackSid }]);

        return trackSid;
      } catch (error) {
        console.error("[StudioLiveKit] 비디오 트랙 publish 실패:", error);
        return null;
      }
    },
    []
  );

  // 오디오 트랙 publish
  const publishAudioTrack = useCallback(
    async (sourceId: string, deviceId?: string): Promise<string | null> => {
      const room = roomRef.current;
      if (!room || room.state !== ConnectionState.Connected) {
        console.warn("[StudioLiveKit] Room이 연결되지 않음");
        return null;
      }

      try {
        const track = await createLocalAudioTrack({
          deviceId,
        });

        const publication = await room.localParticipant.publishTrack(track, {
          name: sourceId,
          source: Track.Source.Microphone,
        });

        const trackSid = publication.trackSid;
        console.log("[StudioLiveKit] 오디오 트랙 publish 완료:", trackSid);

        setPublishedTracks((prev) => [...prev, { sourceId, track, trackSid }]);

        return trackSid;
      } catch (error) {
        console.error("[StudioLiveKit] 오디오 트랙 publish 실패:", error);
        return null;
      }
    },
    []
  );

  // 화면 공유 트랙 publish
  const publishScreenTrack = useCallback(
    async (sourceId: string): Promise<string | null> => {
      const room = roomRef.current;
      if (!room || room.state !== ConnectionState.Connected) {
        console.warn("[StudioLiveKit] Room이 연결되지 않음");
        return null;
      }

      try {
        const tracks = await createLocalScreenTracks({
          audio: false,
          resolution: { width: 1920, height: 1080, frameRate: 30 },
        });

        const videoTrack = tracks.find((t) => t.kind === Track.Kind.Video);
        if (!videoTrack) {
          console.warn("[StudioLiveKit] 화면 공유 비디오 트랙을 찾을 수 없음");
          return null;
        }

        // 화면 공유 중지 감지 (브라우저에서 "공유 중지" 클릭 시)
        const mediaStreamTrack = videoTrack.mediaStreamTrack;
        if (mediaStreamTrack) {
          localPublishedStreamsRef.current.set(sourceId, new MediaStream([mediaStreamTrack]));
          mediaStreamTrack.addEventListener("ended", () => {
            console.log("[StudioLiveKit] 화면 공유 트랙 ended:", sourceId);
            localPublishedStreamsRef.current.delete(sourceId);
            setPublishedTracks((prev) => prev.filter((t) => t.sourceId !== sourceId));
            onTrackEnded?.(sourceId);
          });
        }

        const publication = await room.localParticipant.publishTrack(videoTrack, {
          name: sourceId,
          source: Track.Source.ScreenShare,
        });

        const trackSid = publication.trackSid;
        console.log("[StudioLiveKit] 화면 공유 트랙 publish 완료:", trackSid);

        setPublishedTracks((prev) => [...prev, { sourceId, track: videoTrack, trackSid }]);

        return trackSid;
      } catch (error) {
        console.error("[StudioLiveKit] 화면 공유 트랙 publish 실패:", error);
        return null;
      }
    },
    [onTrackEnded]
  );

  // 트랙 unpublish. keepTrackAlive=true면 track.stop() 생략 (Go Live 시 캔버스 그리기용 유지)
  const unpublishTrack = useCallback(
    async (
      sourceId: string,
      options?: { keepTrackAlive?: boolean }
    ): Promise<void> => {
      const room = roomRef.current;
      if (!room) return;

      const publishedTrack = publishedTracks.find((t) => t.sourceId === sourceId);
      if (!publishedTrack) return;

      try {
        await room.localParticipant.unpublishTrack(publishedTrack.track);
        if (!options?.keepTrackAlive) {
          publishedTrack.track.stop();
        }

        setPublishedTracks((prev) =>
          prev.filter((t) => t.sourceId !== sourceId)
        );

        console.log(
          "[StudioLiveKit] 트랙 unpublish 완료:",
          sourceId,
          options?.keepTrackAlive ? "(track 유지)" : ""
        );
      } catch (error) {
        console.error("[StudioLiveKit] 트랙 unpublish 실패:", error);
      }
    },
    [publishedTracks]
  );

  // 원격 소스의 MediaStream 가져오기
  const getRemoteStream = useCallback((trackSid: string): MediaStream | null => {
    const remoteSource = remoteSources.find((s) => s.trackSid === trackSid);
    if (!remoteSource) return null;

    const track = remoteSource.track;
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const mediaStreamTrack = track.mediaStreamTrack;
      if (mediaStreamTrack) {
        return new MediaStream([mediaStreamTrack]);
      }
    }
    return null;
  }, [remoteSources]);

  const getRoom = useCallback(() => roomRef.current, []);

  return {
    isConnected,
    room: roomRef.current,
    getRoom,
    remoteSources,
    publishedTracks,
    localPublishedStreamsRef,
    publishVideoTrack,
    publishAudioTrack,
    publishScreenTrack,
    unpublishTrack,
    getRemoteStream,
  };
}
