import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Source } from "@/entities/studio/model";
import {
  setPreferredVideoDeviceId,
  setPreferredAudioDeviceId,
} from "@/shared/lib/device-preferences";
import type { RemoteSource, LocalPublishedTrack } from "./useStudioLiveKit";

export interface UseSourceStreamsOptions {
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  /** 원격 소스 목록 (LiveKit에서 받은 것) */
  remoteSources?: RemoteSource[];
  /** 로컬에서 publish한 트랙 목록 (화면 공유 등) */
  publishedTracks?: LocalPublishedTrack[];
}

export function useSourceStreams(
  sources: Source[],
  options: UseSourceStreamsOptions = {}
) {
  const { isVideoEnabled = true, isAudioEnabled = true, remoteSources = [], publishedTracks = [] } = options;
  const [streamsMap, setStreamsMap] = useState<Map<string, MediaStream>>(
    () => new Map()
  );
  const requestedRef = useRef<Set<string>>(new Set());
  const streamsMapRef = useRef<Map<string, MediaStream>>(streamsMap);
  const sourceIdsRef = useRef<Set<string>>(new Set());
  streamsMapRef.current = streamsMap;

  useEffect(() => {
    const needStream = (s: Source) =>
      (s.type === "video" && isVideoEnabled) ||
      s.type === "audio" ||
      (s.type === "screen" && isVideoEnabled);
    const sourceIds = new Set(sources.filter(needStream).map((s) => s.id));
    sourceIdsRef.current = sourceIds;
    const sourceById = new Map(sources.map((s) => [s.id, s]));

    setStreamsMap((prev) => {
      let changed = false;
      const next = new Map(prev);
      next.forEach((stream, id) => {
        if (!sourceIds.has(id)) {
          // 원격 소스는 트랙을 stop하지 않음 (LiveKit에서 관리)
          const source = sourceById.get(id);
          if (!source?.isRemote) {
            stream.getTracks().forEach((t) => t.stop());
          }
          next.delete(id);
          requestedRef.current.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    sourceIds.forEach((id) => {
      const source = sourceById.get(id);
      if (!source) return;

      // 원격 소스인 경우 (다른 사용자가 공유한 미디어)
      // requestedRef를 사용하지 않고 항상 확인 (trackSid가 나중에 업데이트될 수 있음)
      if (source.isRemote) {
        // 이미 스트림이 있으면 스킵
        if (streamsMapRef.current.has(id)) return;

        // trackSid가 있으면 remoteSources에서 스트림 가져오기
        if (source.trackSid) {
          const remoteSource = remoteSources.find((rs) => rs.trackSid === source.trackSid);
          if (remoteSource) {
            const track = remoteSource.track;
            const mediaStreamTrack = track.mediaStreamTrack;
            if (mediaStreamTrack) {
              const stream = new MediaStream([mediaStreamTrack]);
              console.log("[useSourceStreams] 원격 스트림 설정:", id, source.trackSid);
              setStreamsMap((prev) => new Map(prev).set(id, stream));
            } else {
              console.warn("[useSourceStreams] 원격 트랙의 mediaStreamTrack이 없음:", source.trackSid);
            }
          } else {
            console.warn("[useSourceStreams] remoteSources에서 트랙을 찾을 수 없음:", source.trackSid);
          }
        } else {
          // trackSid가 없으면 LiveKit에서 스트림을 받을 때까지 대기 (getUserMedia 호출 안 함)
          console.log("[useSourceStreams] 원격 소스 대기 중 (trackSid 없음):", id);
        }
        return;
      }

      // 로컬 소스는 requestedRef로 중복 요청 방지
      if (requestedRef.current.has(id)) return;
      requestedRef.current.add(id);

      // 로컬 screen 소스는 publishedTracks에서 스트림 가져오기
      if (source.type === "screen" && !source.isRemote) {
        const publishedTrack = publishedTracks.find((pt) => pt.sourceId === id);
        if (publishedTrack?.track) {
          const mediaStreamTrack = publishedTrack.track.mediaStreamTrack;
          if (mediaStreamTrack) {
            const stream = new MediaStream([mediaStreamTrack]);
            console.log("[useSourceStreams] 로컬 screen 스트림 설정 (publishedTracks):", id);
            setStreamsMap((prev) => new Map(prev).set(id, stream));
          } else {
            console.log("[useSourceStreams] screen 트랙 대기 중:", id);
            requestedRef.current.delete(id);
          }
        } else {
          console.log("[useSourceStreams] screen 소스 publish 대기 중:", id);
          requestedRef.current.delete(id);
        }
        return;
      }

      const constraints: MediaStreamConstraints = {};
      if (source.type === "video") {
        constraints.video = source.deviceId
          ? {
              deviceId: { ideal: source.deviceId },
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 },
              frameRate: { ideal: 30 },
            }
          : {
              width: { ideal: 1920, min: 640 },
              height: { ideal: 1080, min: 480 },
              frameRate: { ideal: 30 },
            };
        constraints.audio = isAudioEnabled;
      } else if (source.type === "audio") {
        constraints.audio = source.deviceId
          ? { deviceId: { ideal: source.deviceId } }
          : true;
        constraints.video = false;
      }

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          if (!sourceIdsRef.current.has(id)) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          const vt = stream.getVideoTracks()[0];
          if (vt) {
            const settings = vt.getSettings();
            if (settings.deviceId) setPreferredVideoDeviceId(settings.deviceId);
          }
          const at = stream.getAudioTracks()[0];
          if (at) {
            const settings = at.getSettings();
            if (settings.deviceId) setPreferredAudioDeviceId(settings.deviceId);
          }
          setStreamsMap((prev) => new Map(prev).set(id, stream));
        })
        .catch((err) => {
          requestedRef.current.delete(id);
          console.warn("useSourceStreams:", id, err);
        });
    });
  }, [sources, isVideoEnabled, isAudioEnabled, remoteSources, publishedTracks]);

  useEffect(() => {
    return () => {
      streamsMapRef.current.forEach((stream) => {
        stream.getTracks().forEach((t) => t.stop());
      });
      requestedRef.current.clear();
    };
  }, []);

  /** streamsMapRef 사용으로 stale closure 방지 - 스트림이 비동기 로드된 후에도 최신 맵 참조 */
  const getStream = useCallback(
    (sourceId: string): MediaStream | undefined =>
      streamsMapRef.current.get(sourceId),
    []
  );
  /** bannerRemainingSeconds 등 부모 리렌더 시 새 배열 생성 방지 → PreviewArea 불필요 리렌더/깜빡임 방지 */
  const streamIds = useMemo(() => Array.from(streamsMap.keys()), [streamsMap]);

  return { streamsMap, getStream, streamIds };
}
