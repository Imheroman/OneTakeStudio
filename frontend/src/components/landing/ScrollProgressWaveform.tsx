"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";

const WIDTH = 640;
const HEIGHT = 160;
const CENTER_Y = HEIGHT / 2;
const POINTS = 120;

/** 지저분하고 날카로운 붉은색 파형용 y값 (불규칙, NG 구간 강조) */
function getMessyWavePoints(): number[] {
  const points: number[] = [];
  const amplitude = 48;
  for (let i = 0; i <= POINTS; i++) {
    const t = i / POINTS;
    const noise =
      Math.sin(i * 0.5) * 12 +
      Math.cos(i * 0.8) * 15 +
      (i % 7 === 0 ? 20 : 0) +
      (i % 13 === 0 ? -15 : 0);
    const sharp = (i % 5 === 0 ? 1.3 : 1) * Math.sin(t * Math.PI * 2.5);
    const y = CENTER_Y - amplitude * (sharp * 0.6 + noise * 0.4);
    points.push(Math.max(8, Math.min(HEIGHT - 8, y)));
  }
  return points;
}

/** 매끄럽고 빛나는 보라색 파형용 y값 (부드러운 곡선) */
function getCleanWavePoints(): number[] {
  const points: number[] = [];
  const amplitude = 52;
  for (let i = 0; i <= POINTS; i++) {
    const t = i / POINTS;
    const smooth =
      0.7 * Math.sin(t * Math.PI) +
      0.3 * Math.sin(t * Math.PI * 4 + 0.5) * 0.4;
    const y = CENTER_Y - amplitude * smooth;
    points.push(Math.max(12, Math.min(HEIGHT - 12, y)));
  }
  return points;
}

function pointsToSmoothPath(points: number[], width: number): string {
  const step = width / (points.length - 1);
  let d = `M 0 ${CENTER_Y} L 0 ${points[0]}`;
  for (let i = 1; i < points.length; i++) {
    const x = i * step;
    const xPrev = (i - 1) * step;
    const cpX = (xPrev + x) / 2;
    d += ` Q ${cpX} ${points[i - 1]}, ${x} ${points[i]}`;
  }
  d += ` L ${width} ${CENTER_Y} Z`;
  return d;
}

const MESSY_PATH = pointsToSmoothPath(getMessyWavePoints(), WIDTH);
const CLEAN_PATH = pointsToSmoothPath(getCleanWavePoints(), WIDTH);

function WaveformCard({
  scanProgress,
  isComplete,
}: {
  scanProgress: number;
  isComplete: boolean;
}) {
  const scanX = scanProgress * (WIDTH + 32) - 16;

  return (
    <div className="relative w-full max-w-[min(92vw,680px)] rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30" />
        <span className="text-sm font-medium text-white/95">OneTake</span>
      </div>

      {/* 파형 영역 */}
      <div className="relative overflow-hidden rounded-xl bg-black/60 p-5 h-[200px] sm:h-[220px]">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="ngGrad"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
              gradientUnits="userSpaceOnUse"
              gradientTransform="scale(1)"
            >
              <stop offset="0%" stopColor="#dc2626" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient
              id="cleanGrad"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <filter id="glowPurple">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feFlood floodColor="#a78bfa" floodOpacity="0.4" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Before: 지저분한 붉은색 파형 (전체) */}
          <path
            d={MESSY_PATH}
            fill="url(#ngGrad)"
            opacity={0.95}
            className="transition-opacity duration-300"
          />
          {/* NG 라벨 (파형 위) */}
          <text
            x={WIDTH * 0.22}
            y={CENTER_Y - 58}
            fill="rgba(255,255,255,0.85)"
            fontSize="11"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            NG
          </text>

          {/* After: 매끄러운 보라색 파형 (스캔 진행만큼만 clip) */}
          <g
            style={{
              clipPath: `inset(0 ${100 - scanProgress * 100}% 0 0)`,
              transition: "clip-path 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <path
              d={CLEAN_PATH}
              fill="url(#cleanGrad)"
              filter="url(#softGlow)"
              opacity={0.98}
            />
          </g>

          {/* 스캐닝 빛줄기 + 글로우 (강렬한 보라색 빛줄기) */}
          <g
            transform={`translate(${scanX}, 0)`}
            style={{ transition: "transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)" }}
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={HEIGHT}
              stroke="#c4b5fd"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#glowPurple)"
              opacity={0.95}
            />
          </g>

          {/* 파티클 느낌: 빛줄기 주변 작은 점들 */}
          {scanProgress > 0.02 && scanProgress < 0.98 && (
            <g
              transform={`translate(${scanX}, 0)`}
              style={{ transition: "transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)" }}
            >
              {[-25, 0, 25, -12, 12].map((dy, i) => (
                <circle
                  key={i}
                  cx={0}
                  cy={CENTER_Y + dy}
                  r={1.5 + (i % 2) * 0.8}
                  fill="#c4b5fd"
                  opacity={0.5 + 0.25 * (1 - Math.abs(dy) / 30)}
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* NG / 음성 / 중복 / 빈 태그 */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {["NG", "음성", "중복", "빈"].map((label) => (
          <span
            key={label}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/60 border border-white/10"
          >
            {label}
          </span>
        ))}
      </div>

      {/* CTA: 초기 비활성(붉은 은은한 빛) → 완료 시 보라 그라데이션 + 반짝임 */}
      <motion.button
        type="button"
        disabled={!isComplete}
        className="mt-5 w-full rounded-xl py-4 text-base font-semibold transition-all duration-500 overflow-hidden relative"
        style={{
          background: isComplete
            ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)"
            : "rgba(127, 29, 29, 0.4)",
          color: isComplete ? "#fff" : "rgba(255,255,255,0.5)",
          boxShadow: isComplete
            ? "0 0 32px rgba(139, 92, 246, 0.45), 0 4px 24px rgba(0,0,0,0.3)"
            : "0 0 20px rgba(185, 28, 28, 0.25)",
          cursor: isComplete ? "pointer" : "not-allowed",
        }}
        whileHover={isComplete ? { scale: 1.02, boxShadow: "0 0 40px rgba(139, 92, 246, 0.5)" } : undefined}
        whileTap={isComplete ? { scale: 0.98 } : undefined}
      >
        {isComplete && (
          <motion.span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
            style={{ width: "50%" }}
          />
        )}
        <span className="relative z-10">NG컷 삭제하기</span>
      </motion.button>
    </div>
  );
}

export function ScrollProgressWaveform() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh;
      const scrolled = vh - rect.top;
      const p = Math.max(0, Math.min(1, scrolled / total));
      setProgress(p);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scanProgress = useMemo(() => {
    if (progress <= 0.12) return 0;
    if (progress >= 0.88) return 1;
    return (progress - 0.12) / 0.76;
  }, [progress]);

  const isComplete = progress >= 0.9;
  const showHint = progress < 0.15;

  return (
    <section
      id="solution"
      ref={sectionRef}
      className="relative"
      style={{ height: "280vh" }}
    >
      <div className="sticky top-0 min-h-screen flex flex-col justify-center items-center py-20 px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="text-[40px] sm:text-[48px] md:text-[56px] font-bold text-center text-white mb-3 px-4"
        >
          클릭 한 번이면 NG 장면이 사라져요
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="text-white/50 text-center max-w-lg mx-auto mb-6 px-4 text-sm sm:text-base"
        >
          AI가 음성과 댓글 밀집도를 분석해 침묵을 없애고, 알차고 재밌게. 3개의 쇼츠를 만들어 드려요.
        </motion.p>

        {/* 진입 시 안내 문구 */}
        <motion.p
          className="text-purple-300/90 text-center text-sm mb-4 px-4 flex items-center justify-center gap-2"
          animate={{ opacity: showHint ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ pointerEvents: "none", minHeight: "1.5rem" }}
        >
          {showHint && (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              스크롤을 내려보세요
            </>
          )}
        </motion.p>

        <WaveformCard scanProgress={scanProgress} isComplete={isComplete} />
      </div>
    </section>
  );
}
