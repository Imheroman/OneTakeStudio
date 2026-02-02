import { useState, useEffect, useRef, useCallback } from "react";
import type { Source } from "@/entities/studio/model";
import {
  setPreferredVideoDeviceId,
  setPreferredAudioDeviceId,
} from "@/shared/lib/device-preferences";

export interface UseSourceStreamsOptions {
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

export function useSourceStreams(
  sources: Source[],
  options: UseSourceStreamsOptions = {}
) {
  const { isVideoEnabled = true, isAudioEnabled = true } = options;
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
          stream.getTracks().forEach((t) => t.stop());
          next.delete(id);
          requestedRef.current.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    sourceIds.forEach((id) => {
      if (requestedRef.current.has(id)) return;
      const source = sourceById.get(id);
      if (!source) return;

      requestedRef.current.add(id);

      if (source.type === "screen") {
        const nav = typeof navigator !== "undefined" ? navigator : null;
        const mediaDevices = nav?.mediaDevices as MediaDevices | undefined;
        if (!mediaDevices?.getDisplayMedia) {
          requestedRef.current.delete(id);
          return;
        }
        mediaDevices
          .getDisplayMedia({ video: true, audio: isAudioEnabled })
          .then((stream) => {
            if (!sourceIdsRef.current.has(id)) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            setStreamsMap((prev) => new Map(prev).set(id, stream));
          })
          .catch((err) => {
            requestedRef.current.delete(id);
            console.warn("useSourceStreams (screen):", id, err);
          });
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
  }, [sources, isVideoEnabled, isAudioEnabled]);

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
  const streamIds = Array.from(streamsMap.keys());

  return { streamsMap, getStream, streamIds };
}
