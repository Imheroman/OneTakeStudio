/**
 * 소스별 미디어 스트림 단일 관리
 * PreviewArea와 StagingArea가 같은 스트림을 공유해 getUserMedia 중복 호출을 막습니다.
 */

import { useState, useEffect, useRef } from "react";
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
  streamsMapRef.current = streamsMap;

  useEffect(() => {
    const needStream = (s: Source) =>
      (s.type === "video" && isVideoEnabled) || s.type === "audio";
    const sourceIds = new Set(
      sources.filter(needStream).map((s) => s.id)
    );
    const sourceById = new Map(sources.map((s) => [s.id, s]));

    // 제거: 더 이상 소스 목록에 없는 스트림 정리
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

    // 추가: 새로 필요한 소스에 대해 getUserMedia 1회만
    sourceIds.forEach((id) => {
      if (requestedRef.current.has(id)) return;
      const source = sourceById.get(id);
      if (!source) return;

      requestedRef.current.add(id);
      const constraints: MediaStreamConstraints = {};

      if (source.type === "video") {
        constraints.video = source.deviceId
          ? { deviceId: { ideal: source.deviceId }, width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 }, frameRate: { ideal: 30 } }
          : { width: { ideal: 1920, min: 640 }, height: { ideal: 1080, min: 480 }, frameRate: { ideal: 30 } };
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

  // 언마운트 시 전체 정리
  useEffect(() => {
    return () => {
      streamsMapRef.current.forEach((stream) => {
        stream.getTracks().forEach((t) => t.stop());
      });
      requestedRef.current.clear();
    };
  }, []);

  const getStream = (sourceId: string): MediaStream | undefined =>
    streamsMap.get(sourceId);

  /** 스트림이 준비된 소스 ID 목록. 이 값이 바뀔 때마다 소비 컴포넌트가 리렌더되어 새 스트림을 반영할 수 있음 */
  const streamIds = Array.from(streamsMap.keys());

  return { streamsMap, getStream, streamIds };
}
