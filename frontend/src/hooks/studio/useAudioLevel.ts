"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 마이크 입력 레벨을 0~1로 반환.
 * isEnabled가 true일 때만 getUserMedia(audio)로 스트림을 열고 AnalyserNode로 레벨 샘플링.
 */
export function useAudioLevel(isEnabled: boolean): number {
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const updateLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) {
      setLevel(0);
      return;
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = data.length > 0 ? sum / data.length / 255 : 0;
    setLevel(Math.min(1, avg * 2));
    rafRef.current = requestAnimationFrame(updateLevel);
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      setLevel(0);
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const ctx = new AudioContext();
        if (cancelled) {
          ctx.close();
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        rafRef.current = requestAnimationFrame(updateLevel);
      } catch (err) {
        if (!cancelled) setLevel(0);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      analyserRef.current = null;
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {}
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setLevel(0);
    };
  }, [isEnabled, updateLevel]);

  return level;
}
