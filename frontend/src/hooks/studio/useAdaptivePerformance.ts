"use client";

import { useEffect, useRef } from "react";

/** 프레임 시간 임계치(ms). 이 값을 넘기면 저성능으로 간주 */
const FRAME_TIME_THRESHOLD_MS = 45;
/** 연속 N프레임 저성능 시 onDegraded 호출 */
const CONSECUTIVE_BAD_FRAMES = 5;
/** onDegraded 재호출 전 쿨다운(ms) */
const COOLDOWN_MS = 30_000;

export interface UseAdaptivePerformanceOptions {
  /** 저성능 감지 시 한 번 호출 (예: 해상도 720p로 낮추기) */
  onDegraded?: () => void;
  /** 모니터링 활성화 (프리뷰/라이브 중일 때만 true 권장) */
  enabled?: boolean;
}

/**
 * rAF 기반 프레임 시간 모니터링. 브라우저에서 CPU%를 직접 알 수 없으므로
 * 프레임 드롭(긴 delta)을 저성능 대리 지표로 사용.
 */
export function useAdaptivePerformance({
  onDegraded,
  enabled = true,
}: UseAdaptivePerformanceOptions) {
  const lastTimeRef = useRef<number>(0);
  const badCountRef = useRef(0);
  const lastDegradedRef = useRef(0);
  const onDegradedRef = useRef(onDegraded);
  onDegradedRef.current = onDegraded;

  useEffect(() => {
    if (!enabled || !onDegradedRef.current) return;

    let rafId: number;

    const tick = (now: number) => {
      const prev = lastTimeRef.current;
      lastTimeRef.current = now;
      if (prev > 0) {
        const dt = now - prev;
        if (dt > FRAME_TIME_THRESHOLD_MS) {
          badCountRef.current += 1;
          if (badCountRef.current >= CONSECUTIVE_BAD_FRAMES) {
            const since = now - lastDegradedRef.current;
            if (since >= COOLDOWN_MS) {
              lastDegradedRef.current = now;
              badCountRef.current = 0;
              onDegradedRef.current?.();
            }
          }
        } else {
          badCountRef.current = 0;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled]);
}
