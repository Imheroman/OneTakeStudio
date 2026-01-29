"use client";

import { useState, useEffect, useCallback } from "react";

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "videoinput" | "audioinput";
}

/**
 * navigator.mediaDevices.enumerateDevices() 기반 비디오/오디오 장치 목록 훅.
 * 권한 미허용 시 label이 비어 있을 수 있음.
 */
export function useEnumerateDevices(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      setVideoDevices([]);
      setAudioDevices([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const video = devices
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `카메라 ${d.deviceId.slice(0, 8)}`,
          kind: "videoinput" as const,
        }));
      const audio = devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `마이크 ${d.deviceId.slice(0, 8)}`,
          kind: "audioinput" as const,
        }));
      setVideoDevices(video);
      setAudioDevices(audio);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setVideoDevices([]);
      setAudioDevices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { videoDevices, audioDevices, isLoading, error, refresh };
}
