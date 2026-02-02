"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const HISTORY_LENGTH = 24;
const SMOOTHING = 0.7;

function getLevelFromAnalyser(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const sum = data.reduce((a, b) => a + b, 0);
  const avg = data.length > 0 ? sum / data.length / 255 : 0;
  return Math.min(1, avg * 2);
}

/**
 * 마이크 + 영상공유 등 여러 오디오 소스의 레벨을 합쳐
 * 실시간 음량 믹스바용 히스토리 배열 반환.
 * levelHistory: [최신, ..., 과거] - 가로 막대 그래프용
 */
export function useVolumeMeter(
  isMicEnabled: boolean,
  micLevel: number,
  streams: MediaStream[]
) {
  const [levelHistory, setLevelHistory] = useState<number[]>(() =>
    Array(HISTORY_LENGTH).fill(0)
  );
  const analysersRef = useRef<Map<string, { analyser: AnalyserNode; ctx: AudioContext }>>(new Map());
  const rafRef = useRef<number>(0);
  const lastLevelRef = useRef(0);

  const streamsWithAudio = streams.filter((s) => s.getAudioTracks().length > 0);

  const updateLevel = useCallback(() => {
    let maxLevel = 0;

    // 마이크 레벨
    if (isMicEnabled) {
      maxLevel = Math.max(maxLevel, micLevel);
    }

    // 스트림(영상공유 등) 레벨
    analysersRef.current.forEach(({ analyser }) => {
      maxLevel = Math.max(maxLevel, getLevelFromAnalyser(analyser));
    });

    const smoothed =
      lastLevelRef.current * SMOOTHING + maxLevel * (1 - SMOOTHING);
    lastLevelRef.current = smoothed;

    setLevelHistory((prev) => {
      const next = [smoothed, ...prev.slice(0, HISTORY_LENGTH - 1)];
      return next;
    });

    rafRef.current = requestAnimationFrame(updateLevel);
  }, [isMicEnabled, micLevel]);

  useEffect(() => {
    const currentIds = new Set(streamsWithAudio.map((s) => s.id));
    const existingIds = new Set(analysersRef.current.keys());

    // 제거된 스트림 정리
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        const entry = analysersRef.current.get(id);
        if (entry) {
          try {
            entry.ctx.close();
          } catch {}
          analysersRef.current.delete(id);
        }
      }
    });

    // 새 스트림에 Analyser 연결
    streamsWithAudio.forEach((stream) => {
      if (analysersRef.current.has(stream.id)) return;

      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analysersRef.current.set(stream.id, { analyser, ctx });
      } catch {
        // 스트림 준비 안 됨 등
      }
    });
  }, [streamsWithAudio]);

  useEffect(() => {
    const hasSource = isMicEnabled || analysersRef.current.size > 0;
    if (!hasSource) {
      setLevelHistory(Array(HISTORY_LENGTH).fill(0));
      lastLevelRef.current = 0;
      return;
    }
    rafRef.current = requestAnimationFrame(updateLevel);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isMicEnabled, updateLevel]);

  useEffect(() => {
    return () => {
      analysersRef.current.forEach(({ ctx }) => {
        try {
          ctx.close();
        } catch {}
      });
      analysersRef.current.clear();
    };
  }, []);

  return levelHistory;
}
